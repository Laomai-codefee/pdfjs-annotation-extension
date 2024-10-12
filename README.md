<div>
    <h1 align="center"><code>pdf.js Annotation Extension</code> ⚡️ </h1>
    <p align="center">
        <strong>An annotation extension based on the PDF.js viewer<br/> Supporting the editing of existing PDF file annotations, posting comments, replying, submitting annotation data, and loading for further editing.</strong>
    </p>
</div>

---

English | [简体中文](./README_CN.md)

## 1. Background

[PDF.js](https://mozilla.github.io/pdf.js/) provides a [Viewer](https://mozilla.github.io/pdf.js/web/viewer.html) for online PDF preview and includes some basic annotation functionalities (FREETEXT, HIGHLIGHT, STAMP, INK).

In actual use cases, there is often a need for various annotation tools, leading to the idea of extending the viewer to add more annotation capabilities.

This project is based on `konva`, `react`, `antd`, and `web-highlighter`. It introduces additional annotation types by extending the existing `pdf.js` viewer without modifying its original code. Supports editing existing annotations, submitting annotation data, and loading for further editing, as shown below:

<div align="center">
  <img src="/examples/demo.gif" alt="demo" />
</div>

#### Mobile Version

<div align="center">
  <img src="/examples/mobile.gif" alt="mobile demo" />
</div>

For PDF Viewer users, this is a highly useful feature. If your requirement is simple annotation, the current features in the project should suffice. For more specific needs or requirements, you can further develop based on this extension.

## 2. Annotation Tools (Mobile Supported 📱)

1. Rectangle
2. Circle
3. Free Hand (grouped if drawn within a short time)
4. Free Highlight (with auto-correction)
5. FreeText 
6. Signature
7. Stamp (upload custom images)
8. Text Highlight
9. Text Strikeout
10. Text Underline
11. Annotation Selection (use double-click to delete the selected object)

## 3. Editing existing annotations in PDF files

<strong style="color:red">💡 Only editing of existing annotations in the PDF file is supported. Writing annotations back to the PDF file is no longer supported. To write annotations to the file, please use the annotation data and process the writing on the server.</strong>

1. Square
2. Circle
3. Ink
4. FreeText
5. Line
6. Polygon
7. PolyLine
8. Text
9. Highlight
10. Underline
11. StrikeOut

## 4. Quick Start

### Installation

```bash
 $ npm install or yarn
```

### Run in Development Mode

```bash
  $ npm run dev or yarn dev
```

### Run PDF.js Viewer

A DEMO example is provided in the repository (located in the examples folder). Navigate to ./examples/pdfjs-4.3.136-dist:

```bash
    $ miniserve or use another static server
```

Open the URL: http://localhost:8080/web/viewer.html to see the result.

## 5. Usage

### URL Parameters

```bash
  ae_username= Name of the annotator, displayed as the annotator's name when adding annotations
```
```bash
  ae_get_url= URL for annotation data, used to load previously saved annotation data. Example: ./examples/pdfjs-4.3.136-dist/web/pdfjs-annotation-extension-testdata.json
```
```bash
  ae_post_url= URL for submitting annotation data
```
Usage: http://localhost:8888/web/viewer.html?#ae_username=laomai&ae_get_url=http://localhost:8888/pdfjs-annotation-extension-testdata.json&ae_post_url=http://localhost:8888/save

### Default Configuration
```
 src/const/default_options.ts
 ```
To load PDF file annotations, modify:
 ```
  LOAD_PDF_ANNOTATION: true, // Whether to load existing PDF annotations
 ```
 ***Note：If you need to edit existing PDF annotations, you must set annotationMode in PDF.js to 0, so that PDF.js will not render the annotations***
 ```
  pdfjs-dist/web/viewer.mjs
 ```
 ```
  annotationMode: {
    value: 0,  // Change to 0
    kind: OptionKind.VIEWER + OptionKind.PREFERENCE
  }
 ```

### Modify Output Directory

   The configuration can be found in the /configuration/environment.js file. By default, it points to examples/pdfjs-4.3.136-dist/web/pdfjs-annotation-extension. You can modify it to match your local pdfjs-dist directory to facilitate development:

```bash
    output: path.resolve(__dirname, '../examples/pdfjs-4.3.136-dist/web/pdfjs-annotation-extension'),
```

### Build

```bash
    $ npm run build or yarn build
```

Alternatively, you can directly download the release version.

### Integrating with PDF.js

Modify the pdfjs-dist/web/viewer.html file by adding a single line to include the generated extension file:

```html
    <script src="../build/pdf.mjs" type="module"></script>
    <link rel="stylesheet" href="viewer.css">
    <script src="viewer.mjs" type="module"></script>
    <!-- Insert the generated annotation extension file -->
    <script src="./pdfjs-annotation-extension/pdfjs-annotation-extension.js" type="module"></script>
    <!-- End -->
    </head>
```

## 6. How It Works

By leveraging the pdfjs EventBus, we capture page events and dynamically insert a Konva drawing layer. Shapes are drawn on the Konva layer. 
Although there are more annotation types, they are essentially mapped to the ones supported by pdfjs with some additional custom transformations.

For details about pdfjs annotation types, please refer to the documentation here 👇
 https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#faq-annotations

## 7. Compatibility

 Currently, this extension has been tested only with pdfjs-4.3.136-dist.
 **Note that it does not support drawing on rotated pages.**
