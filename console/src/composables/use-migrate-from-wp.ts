import type { Ref } from "vue";
import { apiClient } from "@/utils/api-client";
import type {
  WpCategory,
  WpPost,
  WpTag,
  WpAuthor,
} from "../types/wp-models";
import type { AxiosResponse } from "axios";

interface useMigrateFromWordPressReturn {
  createTagRequests: () => Promise<AxiosResponse>[];
  createCategoryRequests: () => Promise<AxiosResponse>[];
  createPostRequests: () => Promise<AxiosResponse>[];
  createUserRequests: () => Promise<AxiosResponse>[];
}

export function useMigrateFromWordPress(
  wpTags: Ref<WpTag[]>,
  wpCategories: Ref<WpCategory[]>,
  wpPosts: Ref<WpPost[]>,
  wpAuthors: Ref<WpAuthor[]>,
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
            children: wpCategories.value.filter((wpCat: WpCategory) =>
              wpCat.parent === item.slug
            ).flatMap(wpCat => wpCat.id)
          },
        },
      });
    });
  }

  function createPostRequests() {
    return [
      ...wpPosts.value.map((item: WpPost) => {
        const tagIds = item.tags.map((wpTag: WpTag) => wpTag.id + "");
        const categoryIds = item.categories.map((wpCategory: WpCategory) => wpCategory.id + "");

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
                publishTime: item.pubDate ? new Date(item.pubDate).toISOString() : "",
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

  return {
    createTagRequests,
    createCategoryRequests,
    createPostRequests,
    createUserRequests,
  };
}
