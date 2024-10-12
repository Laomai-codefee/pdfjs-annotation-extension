<div>
    <h1 align="center"><code>pdf.js Annotation Extension</code> ⚡️ </h1>
    <p align="center">
        <strong>基于pdf.js viewer的批注扩展，支持PDF文件原有批注编辑、发表评论、回复、批注数据的提交及载入编辑</strong>
    </p>
</div>

---

[English](./README.md) ｜ 简体中文

## 1、背景

[PDF.js](https://mozilla.github.io/pdf.js/) 已经提供了 [Viewer](https://mozilla.github.io/pdf.js/web/viewer.html) 用于PDF文件的在线预览，并且提供了一部分的批注功能（FREETEXT、HIGHLIGHT、STAMP、INK）。

在实际使用中，需要各种形式的批注工具，逐产生在viewer上扩展做额外批注的想法。

项目基于konva、react、antd、web-highlighter，使用外部引入的方式，不影响 pdfjs viewer 原有代码，增加并扩展了一部分批注类型，支持pdf文件中原有批注的编辑、新增批注数据的提交及加载，效果见下图：

<div align="center">
  <img src="/examples/demo.gif" alt="demo" />
</div>

#### 移动端

<div align="center">
  <img src="/examples/mobile.gif" alt="demo" />
</div>

对PDF Viewer来说，这是一个很有用的功能，如果需求只是简单的批注，项目中的现有功能已经可以直接满足。
如果有更特殊的需求或功能要求，可以在此基础上进一步开发。

## 2、批注工具，已支持移动端 📱

1. 矩形
2. 圆形
3. 自由绘制，一段时间内的绘制会被归为一组
4. 自由高亮，有自动修正
5. 文字
6. 签名
7. 盖章，自由上传图片
8. 文字高亮
9. 文字删除线
10. 文字下划线
11. 选择，选中对象，可双击删除

## 3、PDF 文件原有批注编辑，支持类型如下

<strong style="color:red">💡仅支持PDF 文件中原有批注的编辑，不支持将批注写入到 PDF 文件，如需写入批注到文件,请使用提交的批注数据并在服务器上处理写入</strong>

1. 矩形 Square
2. 圆形 Circle
3. 自由绘制 Ink
4. 文字 FreeText
5. 线段 Line
6. 多边形 Polygon
7. 折线 PolyLine
8. 备注 Text
9. 高亮 Highlight
10. 下划线 Underline
11. 删除线 StrikeOut

## 4、快速开始

### 初始化

```bash
    $ npm install 或 yarn
```

### 运行开发模式

```bash
    $ npm run dev 或 yarn dev
```

### 查看效果pdfjs viewer 效果

仓库自带了一个 DEMO 示例（在examples文件夹中, 进入 ./examples/pdfjs-4.3.136-dist 目录

```bash
    $ miniserve 或其他静态服务
```

打开地址：http://localhost:8080/web/viewer.html 即可看到效果

## 5、使用方式

### 地址栏参数
```bash
  ae_username= 批注人姓名，添加批注时显示的批注人姓名
```
```bash
  ae_get_url= 批注数据地址，通过此地址加载已保存的批注数据 示例 ./examples/pdfjs-4.3.136-dist/web/pdfjs-annotation-extension-testdata.json
```
```bash
  ae_post_url= 批注数据提交地址
```
使用方式 ： http://localhost:8888/web/viewer.html?#ae_username=老麦&ae_get_url=http://localhost:8888/pdfjs-annotation-extension-testdata.json&ae_post_url=http://localhost:8888/save

### 默认配置修改

 ```
 src/const/default_options.ts
 ```

 加载PDF文件批注，需修改：
 ```
   LOAD_PDF_ANNOTATION: true, // 是否加载 pdf 原有批注 
 ```
 ***注意： 如果需要编辑 pdf 原有批注，需将 pdfjs 中的 annotationMode 改为 0，这样 pdfjs 才不会渲染批注***
```
  pdfjs-dist/web/viewer.mjs
 ```

 ```
  annotationMode: {
    value: 0,  //这里改为 0
    kind: OptionKind.VIEWER + OptionKind.PREFERENCE
  },
 ```
### 修改生成文件地址

   配置在文件：/configuration/environment.js 中
   默认为 examples/pdfjs-4.3.136-dist/web/pdfjs-annotation-extension
   您可将它修改为您pdfjs dist地址，以方便开发

```bash
  output: path.resolve(__dirname, '../examples/pdfjs-4.3.136-dist/web/pdfjs-annotation-extension'),
```

### 打包

```bash
  $ npm run build 或 yarn build
```

也可以直接下载发布版本

### pdfjs dist 引入扩展

修改文件：pdfjs-dist/web/viewer.html，只需增加一行代码，引入生成的文件即可

```html
    <script src="../build/pdf.mjs" type="module"></script>
    <link rel="stylesheet" href="viewer.css">
    <script src="viewer.mjs" type="module"></script>
    <!--这里引入生成的文件-->
    <script src="./pdfjs-annotation-extension/pdfjs-annotation-extension.js" type="module"></script>
    <!--这里引入生成的文件-->
  </head>
```

## 6、工作原理

利用pdfjs EventBus捕获页面事件，动态插入Konva绘图层，在Konva上绘制图形
批注类型虽然看上去多了，但实际支持与pdfjs一致，只是做了一些特殊的转换。
关于 pdfjs 批注类型的说明请看这里 👇
 https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#faq-annotations

## 7、兼容性

 目前仅测试 pdfjs-4.3.136-dist， 不支持页面旋转后的绘制
