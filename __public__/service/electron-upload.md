### $electronUpload服务

#### 接口

`upload(filepath: String, options?: UploadOption, eventHandles?: Object) -> UploadHandle`

发起一次文件上传。

* filepath：本地文件路径。
* options：可选，文件上传的一些附加设置参数。
* eventHandles: 可选，上传的事件回调集合。
* 返回值：上传句柄对象，可以从中读取上传进度、状态等。

#### 数据结构

`UploadOption`

```
{
    root?: String           # 服务端根存储区
    encrypted?: Boolean     # 上传的文件是否加密
}
```

`UploadHandle`

```
{
    progress: Number            # 上传进度，范围[0, 100]
    fileSize: Number            # 文件的总大小(以字节计数)
    failed: Boolean             # 上传是否失败，上传发生错误时变为true
    finished: Boolean           # 上传是否完成
    token: String,              # 本次上传从服务端获得的令牌
    cancel: Function\<void\>      # 取消上传回调函数，调用该函数打断上传
}
```

#### 事件

`onProgress(handle: UploadHandle)`

上传进度变化事件，参数是本次上传的句柄对象。

`onFinish(handle: UploadHandle)`

上传完成事件，参数是本次上传的句柄对象。

`onFailed(err: Any, handle: UploadHandle)`

上传发生错误事件，参数为错误消息和本次上传的句柄对象。
