touch-image-viewer
==========

添加`touch-image-viewer`元素，通过`img-src`属性指定图片访问路径。

* img-src：图片访问路径
* on-init：可选，组件完成初始化时执行的回调函数，通过该函数可以获取控制图片显示状态的句柄（见下文）

```html
<touch-image-viewer img-src="imageUrl" on-init="onInit"></touch-image-viewer>
```

#### 控制句柄

```
{
    rotateLeft(),               // 向左旋转90°
    rotateRight(),              // 向右旋转90°
    zoomIn(amount: Number),     // 放大图片，amount为放到的比率，如1表示放大1倍
    zoomOut(amoutn: Number),    // 缩小图片
    reset()                     // 重置图片
}
```