import type { Ref } from "vue";
import { apiClient } from "@/utils/api-client";
import type {
  WpCategory,
  WpPost,
  WpTag,
  WpAuthor,
  WpPage,
  WpNavMenu,
  WpNavMenuItem,
} from "../types/wp-models";
import type { AxiosResponse } from "axios";
import type { MenuItem } from "@halo-dev/api-client/index";

interface useMigrateFromWordPressReturn {
  createTagRequests: () => Promise<AxiosResponse>[];
  createCategoryRequests: () => Promise<AxiosResponse>[];
  createPostRequests: () => Promise<AxiosResponse>[];
  createPageRequests: () => Promise<AxiosResponse>[];
  createUserRequests: () => Promise<AxiosResponse>[];
  createMenuRequests: () => Promise<AxiosResponse>[];
}

export function useMigrateFromWordPress(
  wpTags: Ref<WpTag[]>,
  wpCategories: Ref<WpCategory[]>,
  wpPosts: Ref<WpPost[]>,
  wpPages: Ref<WpPage[]>,
  wpAuthors: Ref<WpAuthor[]>,
  wpNavMenu: Ref<WpNavMenu[]>
): useMigrateFromWordPressReturn {
  function createTagRequests() {
    return wpTags.value.map((item: WpTag) => {
      return apiClient.extension.tag.createcontentHaloRunV1alpha1Tag({
        tag: {
          metadata: {
            name: item.id + "",
          },
          kind: "Tag",
          apiVersion: "content.halo.run/v1alpha1",
          spec: {
            displayName: item.name,
            slug: item.slug,
            // 随机生成标签颜色
            // color: '#'+(Math.random()*0xffffff<<0).toString(16)
          },
        },
      });
    });
  }

  function createCategoryRequests() {
    return wpCategories.value.map((item: WpCategory) => {
      return apiClient.extension.category.createcontentHaloRunV1alpha1Category({
        category: {
          metadata: {
            name: item.id + "",
          },
          kind: "Category",
          apiVersion: "content.halo.run/v1alpha1",
          spec: {
            displayName: item.name,
            slug: item.slug,
            priority: 0,
            // 寻找parent为当前分类的子分类
            children: wpCategories.value
              .filter((wpCat: WpCategory) => wpCat.parent === item.slug)
              .flatMap((wpCat) => wpCat.id),
          },
        },
      });
    });
  }

  function createPostRequests() {
    return [
      ...wpPosts.value.map((item: WpPost) => {
        const tagIds = item.tags.map((wpTag: WpTag) => wpTag.id + "");
        const categoryIds = item.categories.map(
          (wpCategory: WpCategory) => wpCategory.id + ""
        );

        // 替换原始content中的WordPress附件图片URL地址为Halo对应地址
        // TODO

        return apiClient.post.draftPost({
          postRequest: {
            post: {
              spec: {
                title: item.title,
                slug: item.title,
                template: "",
                deleted: item.status === "trash",
                publish: item.status === "publish",
                publishTime: item.pubDate
                  ? new Date(item.pubDate).toISOString()
                  : "",
                pinned: item.isSticky === "1",
                allowComment: item.commentStatus === "closed",
                visible: "PUBLIC",
                version: 1,
                priority: 0,
                excerpt: {
                  autoGenerate: false,
                  raw: item.excerpt,
                },
                categories: categoryIds,
                tags: tagIds,
                htmlMetas: [],
                owner: item.creator,
                cover: item.thumbnail,
              },
              apiVersion: "content.halo.run/v1alpha1",
              kind: "Post",
              metadata: {
                name: item.id + "",
              },
            },
            content: {
              raw: item.content,
              content: item.content,
              rawType: "HTML",
            },
          },
        });
      }),
    ];
  }

  function createPageRequests() {
    return [
      ...wpPages.value.map((item: WpPage) => {
        return apiClient.singlePage.draftSinglePage({
          singlePageRequest: {
            page: {
              spec: {
                title: item.title,
                slug: item.title,
                template: "",
                deleted: item.status === "trash",
                publish: item.status === "publish",
                publishTime: item.pubDate
                  ? new Date(item.pubDate).toISOString()
                  : "",
                pinned: item.isSticky === "1",
                allowComment: item.commentStatus === "closed",
                visible: "PUBLIC",
                version: 1,
                priority: 0,
                excerpt: {
                  autoGenerate: false,
                  raw: item.excerpt,
                },
                htmlMetas: [],
                owner: item.creator,
              },
              apiVersion: "content.halo.run/v1alpha1",
              kind: "Post",
              metadata: {
                name: item.id + "",
              },
            },
            content: {
              raw: item.content,
              content: item.content,
              rawType: "HTML",
            },
          },
        });
      }),
    ];
  }

  function createUserRequests() {
    return wpAuthors.value.map((item: WpAuthor) => {
      return apiClient.extension.user.createv1alpha1User({
        user: {
          metadata: {
            name: item.login + "",
          },
          kind: "User",
          apiVersion: "v1alpha1",
          spec: {
            displayName: item.displayName,
            email: item.email,
            disabled: false,
          },
        },
      });
    });
  }

  function createMenuRequests() {
    // create menu and menuitem request
    const menuRequests: Promise<AxiosResponse>[] = [];

    const menuItemsToCreate: MenuItem[] = [] as MenuItem[];
    wpNavMenu.value.forEach((menu: WpNavMenu) => {
      menuRequests.push(
        apiClient.extension.menu.createv1alpha1Menu({
          menu: {
            kind: "Menu",
            apiVersion: "v1alpha1",
            metadata: {
              name: menu.id,
            },
            spec: {
              displayName: menu.name,
              menuItems: menu.items.map((menuItem: WpNavMenuItem) => {
                return menuItem.id + "";
              }),
            },
          },
        })
      );

      menu.items.forEach((menuItem) => {
        let haloMenuItem = {
          kind: "MenuItem",
          apiVersion: "v1alpha1",
          metadata: {
            name: menuItem.id + "",
          },
          spec: {
            displayName: menuItem.name,
            priority: Number(menuItem.order),
            children:
              menu.items
                .filter((item: WpNavMenuItem) => menuItem.parent === item.id)
                .flatMap((item) => item.id) || [],
          },
        } as MenuItem;
        switch (menuItem.targetType) {
          case "page":
            haloMenuItem.spec.targetRef = {
              group: "content.halo.run",
              kind: "SinglePage",
              name: wpPages.value
                .filter((item: WpPage) => menuItem.target === item.id)
                .flatMap((item) => item.id)[0],
              version: "v1alpha1",
            };
            haloMenuItem.spec.displayName =
              menuItem.name ||
              wpPages.value
                .filter((item: WpPage) => menuItem.target === item.id)
                .flatMap((item) => item.title)[0];
            break;
          case "post":
            haloMenuItem.spec.targetRef = {
              group: "content.halo.run",
              kind: "Post",
              name: wpPosts.value
                .filter((item: WpPost) => menuItem.target === item.id)
                .flatMap((item) => item.id)[0],
              version: "v1alpha1",
            };
            haloMenuItem.spec.displayName =
              menuItem.name ||
              wpPosts.value
                .filter((item: WpPost) => menuItem.target === item.id)
                .flatMap((item) => item.title)[0];
            break;
          case "category":
            haloMenuItem.spec.targetRef = {
              group: "content.halo.run",
              kind: "Category",
              name: wpCategories.value
                .filter((item: WpCategory) => menuItem.target === item.id)
                .flatMap((item) => item.id)[0],
              version: "v1alpha1",
            };
            haloMenuItem.spec.displayName =
              menuItem.name ||
              wpCategories.value
                .filter((item: WpCategory) => menuItem.target === item.id)
                .flatMap((item) => item.name)[0];
            break;
          case "custom":
            haloMenuItem.spec.href = menuItem.target;
            break;
          default:
            break;
        }
        menuItemsToCreate.push(haloMenuItem);
      });
    });
    const menuItemRequests: Promise<AxiosResponse>[] = menuItemsToCreate.map(
      (menuItem) => {
        return apiClient.extension.menuItem.createv1alpha1MenuItem({
          menuItem: menuItem,
        });
      }
    );
    return [...menuItemRequests, ...menuRequests];
  }

  return {
    createTagRequests,
    createCategoryRequests,
    createPostRequests,
    createPageRequests,
    createUserRequests,
    createMenuRequests,
  };
}
