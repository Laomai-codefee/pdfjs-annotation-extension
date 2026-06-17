import Konva from 'konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { Editor, IEditorOptions } from './editor';
import { AnnotationType, IAnnotationStyle, IAnnotationStore, IAnnotationContentsObj } from '../../const/definitions';


export class EditorPolyline extends Editor {
  private points: number[] = [];
  private tempLine: Konva.Line | null = null;
  private anchors: Konva.Group[] = [];
  private globalPointerUpHandler: (e: MouseEvent) => void;
  private pendingPointTimeout: NodeJS.Timeout | null = null;
  private lastClickTime: number = 0;
  private lastClickPosition: { x: number; y: number } | null = null;
  private isDraggingAnchor: boolean = false;

  constructor(EditorOptions: IEditorOptions) {
    super({ ...EditorOptions, editorType: AnnotationType.POLYLINE });
    this.globalPointerUpHandler = (e: MouseEvent) => {
      if (e.button !== 0) return;
      this.mouseUpHandler();
      window.removeEventListener('mouseup', this.globalPointerUpHandler);
    };
  }

  protected changeStyle(annotationStore: IAnnotationStore, style: IAnnotationStyle): void {
    const id = annotationStore.id;
    const group = this.getShapeGroupById(id);
    if (!group) {
      return;
    }

    group.getChildren().forEach(shape => {
      if (shape instanceof Konva.Line) {
        if (style.color !== undefined) {
          shape.stroke(style.color);
        }
        if (style.strokeWidth !== undefined) {
          shape.strokeWidth(style.strokeWidth);
        }
        if (style.opacity !== undefined) {
          shape.opacity(style.opacity);
        }
      } else if (shape instanceof Konva.Group) {
        const pinCircle = shape.findOne('.pin-circle') as Konva.Circle | null;
        const pinPoint = shape.findOne('.pin-point') as Konva.Circle | null;
        if (pinCircle && style.color !== undefined) {
          pinCircle.stroke(style.color);
        }
        if (pinPoint && style.color !== undefined) {
          pinPoint.fill(style.color);
        }
      }
    });

    // Find the main line element to get updated points
    const mainLine = group.getChildren().find(shape => 
      shape instanceof Konva.Line && !shape.hasName('temp-polyline')
    ) as Konva.Line | null;
    
    const changedPayload: { konvaString: string; color?: string; contentsObj?: IAnnotationContentsObj } = {
      konvaString: group.toJSON(),
    };
    if (style.color !== undefined) {
      changedPayload.color = style.color;
    }
    if (mainLine) {
      changedPayload.contentsObj = {
        text: 'Polyline Annotation',
        points: mainLine.points(),
      };
    }
    this.setChanged(id, changedPayload);
  }

  protected mouseDownHandler(e: KonvaEventObject<PointerEvent>) {
    if (this.isDraggingAnchor) {
      return;
    }

    if (e.currentTarget !== this.konvaStage) {
      return;
    }

    const target = e.target;
    if (target && (target.hasName('pin-circle') || target.hasName('pin-point') || target.hasName('pin-stem') || target.parent?.hasName('pin-anchor'))) {
      return;
    }

    const pos = this.konvaStage.getRelativePointerPosition();
    const currentTime = Date.now();
    
    const isDoubleClick = this.lastClickTime && 
                         (currentTime - this.lastClickTime) < 400 && 
                         this.lastClickPosition &&
                         Math.sqrt(Math.pow(pos.x - this.lastClickPosition.x, 2) + Math.pow(pos.y - this.lastClickPosition.y, 2)) < 10;

    if (isDoubleClick && this.isPainting && this.points.length >= 4) {
      this.completePolyline();
      return;
    }

    this.lastClickTime = currentTime;
    this.lastClickPosition = { x: pos.x, y: pos.y };

    if (this.pendingPointTimeout) {
      clearTimeout(this.pendingPointTimeout);
    }

    this.pendingPointTimeout = setTimeout(() => {
      if (!this.isPainting) {
        this.isPainting = true;
        this.points = [];
        this.tempLine = null;
        if (!this.currentShapeGroup) {
          this.currentShapeGroup = this.createShapeGroup();
          this.getBgLayer().add(this.currentShapeGroup.konvaGroup);
        }
        window.addEventListener('mouseup', this.globalPointerUpHandler);
      }
      
      const lastX = this.points[this.points.length - 2];
      const lastY = this.points[this.points.length - 1];
      const dist = Math.sqrt(Math.pow(pos.x - lastX, 2) + Math.pow(pos.y - lastY, 2));
      
      if (this.points.length === 0 || dist > 5) {
        this.points.push(pos.x, pos.y);
        
        if (!this.tempLine) {
          this.tempLine = new Konva.Line({
            points: this.points,
            stroke: this.currentAnnotation?.style.color || 'red',
            strokeWidth: this.currentAnnotation?.style.strokeWidth || 2,
            opacity: this.currentAnnotation?.style.opacity || 1,
            lineCap: 'round',
            lineJoin: 'round',
            name: 'temp-polyline',
            strokeScaleEnabled: false,
            hitStrokeWidth: 20,
            globalCompositeOperation: 'source-over',
          });
          this.currentShapeGroup.konvaGroup.add(this.tempLine);
        } else {
          this.tempLine.points(this.points);
        }
      }
    }, 200);
  }

  protected mouseMoveHandler(e: KonvaEventObject<PointerEvent>) {
    if (!this.isPainting || !this.tempLine || this.points.length === 0) return;
    
    // If we're dragging an anchor, don't process stage mouse move events
    if (this.isDraggingAnchor) {
      return;
    }
    
    e.evt.preventDefault();
    const pos = this.konvaStage.getRelativePointerPosition();
    const previewPoints = [...this.points, pos.x, pos.y];
    this.tempLine.points(previewPoints);
    this.getBgLayer().batchDraw();
  }

  protected mouseUpHandler(_e?: KonvaEventObject<PointerEvent>) {
    if (!this.isPainting) return;
    
    // If we're dragging an anchor, don't process stage mouse up events
    if (this.isDraggingAnchor) {
      return;
    }
  }

  protected onStageDblClick = () => {
    if (this.isPainting && this.points.length >= 4) {
      this.completePolyline();
    }
  };

  private completePolyline() {
    if (this.pendingPointTimeout) {
      clearTimeout(this.pendingPointTimeout);
      this.pendingPointTimeout = null;
    }
    
    if (this.points.length < Editor.MinSize) {
      if (this.tempLine) {
        this.tempLine.destroy();
        this.tempLine = null;
      }
      this.points = [];
      this.isPainting = false;
      this.currentShapeGroup = null;
      return;
    }
    
    const finalLine = new Konva.Line({
      points: this.points,
      stroke: this.currentAnnotation?.style.color || 'blue',
      strokeWidth: this.currentAnnotation?.style.strokeWidth || 2,
      opacity: this.currentAnnotation?.style.opacity || 1,
      lineCap: 'round',
      lineJoin: 'round',
      strokeScaleEnabled: false,
      hitStrokeWidth: 20,
      globalCompositeOperation: 'source-over',
    });
    this.currentShapeGroup.konvaGroup.add(finalLine);
    
    this.anchors = [];
    this.points.forEach((_, idx) => {
      if (idx % 2 !== 0) return;
      const x = this.points[idx];
      const y = this.points[idx + 1];
      const pinAnchor = this.createPinAnchor(x, y, finalLine, idx);
      this.currentShapeGroup.konvaGroup.add(pinAnchor);
      this.anchors.push(pinAnchor);
    });
    
    if (this.tempLine) {
      this.tempLine.destroy();
      this.tempLine = null;
    }
    
    this.points = [];
    this.isPainting = false;
    this.lastClickTime = 0;
    this.lastClickPosition = null;
    
    this.setShapeGroupDone({
      id: this.currentShapeGroup.konvaGroup.id(),
      contentsObj: {
        text: 'Polyline Annotation',
        points: finalLine.points(),
      },
      color: this.currentAnnotation?.style.color || 'blue',
      fontSize: 0,
    });
    this.currentShapeGroup = null;
    
    this.getBgLayer().batchDraw();
  }

  private createPinAnchor(x: number, y: number, line: Konva.Line, idx: number) {
    const pinGroup = new Konva.Group({
      x,
      y,
      draggable: true,
      name: 'pin-anchor',
    });

    const pinCircle = new Konva.Circle({
      x: 0,
      y: -8,
      radius: 8,
      fill: 'white',
      stroke: this.currentAnnotation?.style.color || 'black',
      strokeWidth: 2,
      name: 'pin-circle',
    });

    const pinPoint = new Konva.Circle({
      x: 0,
      y: 0,
      radius: 3,
      fill: this.currentAnnotation?.style.color || 'black',
      name: 'pin-point',
    });

    const pinStem = new Konva.Line({
      points: [0, -8, 0, 0],
      stroke: this.currentAnnotation?.style.color || 'black',
      strokeWidth: 2,
      name: 'pin-stem',
    });

    pinGroup.add(pinStem);
    pinGroup.add(pinCircle);
    pinGroup.add(pinPoint);

    pinGroup.on('dragstart', () => {
      this.isDraggingAnchor = true;
      // Remove global mouse handler to prevent interference
      window.removeEventListener('mouseup', this.globalPointerUpHandler);
    });

    pinGroup.on('dragmove', () => {
      const updatedPoints = line.points().slice();
      updatedPoints[idx] = pinGroup.x();
      updatedPoints[idx + 1] = pinGroup.y();
      line.points(updatedPoints);
      this.getBgLayer().batchDraw();
      
      // Debug: log the updated points during drag (can be removed in production)
      // console.log('Anchor dragmove - Point index:', idx, 'New position:', pinGroup.x(), pinGroup.y());
      // console.log('Anchor dragmove - Updated line points:', updatedPoints.slice(0, 8));
    });

    pinGroup.on('dragend', () => {
      this.isDraggingAnchor = false;
      // Update the annotation store with the new points
      const updatedPoints = line.points();
      
      // Get the shape group ID from the line's parent group
      const shapeGroup = line.getParent();
      if (!shapeGroup || !shapeGroup.id()) {
        console.error('ERROR: Could not find shape group ID for anchor dragend!');
        return;
      }
      
      const shapeGroupId = shapeGroup.id();
      
      console.log('=== ANCHOR DRAGEND DEBUG ===');
      console.log('Updated points from line:', updatedPoints.slice(0, 8));
      console.log('Shape group ID:', shapeGroupId);
      console.log('Current shape group exists:', !!this.currentShapeGroup);
      
      const updatePayload = {
        konvaString: shapeGroup.toJSON(),
        contentsObj: {
          text: 'Polyline Annotation',
          points: updatedPoints,
        }
      };
      
      console.log('Update payload contentsObj.points:', updatePayload.contentsObj.points.slice(0, 8));
      console.log('Calling setChanged with ID:', shapeGroupId);
      
      this.setChanged(shapeGroupId, updatePayload);
      
      // Re-add global mouse handler if we're still painting
      if (this.isPainting) {
        window.addEventListener('mouseup', this.globalPointerUpHandler);
      }
      
      console.log('=== END ANCHOR DRAGEND DEBUG ===');
    });

    pinGroup.on('mouseenter', () => {
      document.body.style.cursor = 'pointer';
      pinCircle.radius(10);
      pinPoint.radius(4);
      this.getBgLayer().batchDraw();
    });

    pinGroup.on('mouseleave', () => {
      document.body.style.cursor = 'default';
      pinCircle.radius(8);
      pinPoint.radius(3);
      this.getBgLayer().batchDraw();
    });

    // Add safety handler for mouse up outside the anchor
    pinGroup.on('pointerup', () => {
      if (this.isDraggingAnchor) {
        this.isDraggingAnchor = false;
        // Re-add global mouse handler if we're still painting
        if (this.isPainting) {
          window.addEventListener('mouseup', this.globalPointerUpHandler);
        }
      }
    });

    return pinGroup;
  }

  public activateTool() {
    this.konvaStage.on('dblclick', this.onStageDblClick);
  }

  public deactivateTool() {
    this.konvaStage.off('dblclick', this.onStageDblClick);
    if (this.tempLine) {
      this.tempLine.destroy();
      this.tempLine = null;
    }
    this.points = [];
    this.isPainting = false;
    this.isDraggingAnchor = false;
    this.currentShapeGroup = null;
    window.removeEventListener('mouseup', this.globalPointerUpHandler);
    
    // Reset all anchor dragging states
    this.anchors.forEach(anchor => {
      if (anchor.draggable()) {
        anchor.draggable(false);
        anchor.draggable(true);
      }
    });
  }
}