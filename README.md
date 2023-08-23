## ❗归档说明

鉴于站点迁移插件已经支持了多平台的数据迁移，本仓库将进行归档处理。需要从 WordPress 迁移至 Halo 的用户可以使用站点迁移插件进行迁移。

插件获取：
- Halo 应用市场：https://halo.run/store/apps/app-TlUBt
- GitHub 仓库：https://github.com/halo-sigs/plugin-migrate

-----
# plugin-wordpress

支持将 WordPress 导出的 XML 文件导入到 Halo 2.0 版本中。

## 功能

- [x] 文章分类导入
- [x] 标签导入
- [x] 文章导入
- [x] 文章封面图与 WP 中一致
- [x] 文章发布时间与 WP 中一致
- [x] 菜单导入
- [x] 自定义页面导入
- [x] 用户导入
- [x] 文章作者与 WP 中一致

## 迁移指引

迁移插件目前仅支持 Chrome 浏览器，且必须要求站点是 HTTPS 协议（本地环境不受限制）。

### 导出 WordPress 文件

在 WordPress 管理后台的 `工具`-`导出` 菜单中，选择导出 `所有内容`，下载导出的文件后会得到一个 XML 文件。

### 修改 Halo 配置

在 Halo 配置文件中增加如下配置，通过该配置，用户在 `{halo-work-dir}/attachments/migrate-from-wp/` 上传文件后，可以通过 `{HALO_EXTERNAL_URL}/wp-content/uploads/{文件名}` 访问到该文件，与 WordPress 中的附件链接规则一致。

```yaml
halo:
  attachment:
    resource-mappings:
      - pathPattern: /wp-content/uploads/**
        locations:
          - migrate-from-wp
```

同时，修改 Halo 的 `HALO_EXTERNAL_URL` 配置，与原本的 WordPress 域名保持一致，例如 `https://blog.halo.run`。

### 打包迁移附件文件

在 WordPress 部署服务器后台，找到附件存储目录，例如 `/wordpress_path/blog.halo.run/wp-content`，打包该目录下的 upload 目录。

```bash
tar -czvf upload.tgz uploads/
```

通过上述命令可以将 `uploads` 目录打包为 `upload.tgz` 文件。将得到的 `upload.tgz` 文件拷贝到新的 Halo 服务器上，并在 Halo 工作目录下的 `attachments` 目录中创建与上一步配置的路由规则对应的 `migrate-from-wp` 子目录。

```bash
mkdir -p {halo-work-dir}/attachments/migrate-from-wp
```

将 `upload.tgz` 中的文件解压到上述目录中。

```bash
cd {halo-work-dir}/attachments/migrate-from-wp
tar --strip-components 1 -zxvf /path/to/upload.tgz
```

得到类似这样的目录结构

```
{halo-work-dir}/attachments
├── migrate-from-wp
│   ├── 2011
│   ├── 2015
│   ├── 2016
│   ├── 2017
│   ├── 2018
│   ├── 2019
│   ├── 2020
│   ├── 2021
│   ├── 2022
│   ├── elementor
│   ├── wpforms
│   └── wp-import-export-lite
└── upload
    └── local
```

### 安装插件

从该插件的 Releases 页面下载最新插件，在 Halo 控制台安装并启用插件。安装完成后会在左侧导航菜单出现 `工具`-`WordPress导入`。点击 `WordPress导入` 进入导入页面，点击 `选择文件` 并将在 WordPress 中导出的 XML 文件上传。

插件会解析 XML 文件中包含的内容，确认无误后下方的 `执行导入` 按钮，等待导入完成即可。

### 切换 DNS 解析

由于文章中插件的图片等附件地址没有进行替换，与之前 WordPress 中的地址是一样的。所以在博客域名解析未切换前，通过 Halo 访问文章时图片等请求还是会指向原本的 WordPress 服务中。要完全完成迁移工作，还需要将原本指向 WordPress 服务的域名解析指向新的 Halo 服务器。

## 相关仓库

- https://github.com/halo-sigs/plugin-migrate 在官方迁移插件基础上进行了修改
- https://github.com/TryGhost/migrate.git 参考了部分处理 WordPress XML 文件相关的代码
