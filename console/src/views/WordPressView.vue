<script lang="ts" setup>
import {
  VButton,
  VPageHeader,
  VSpace,
  VEmpty,
  VCard,
  VEntityField,
  VEntity,
  Toast,
  Dialog,
} from "@halo-dev/components";
import { useFileSystemAccess } from "@vueuse/core";
import MdiCogTransferOutline from "~icons/mdi/cog-transfer-outline";
import MdiFileCodeOutline from "~icons/mdi/file-code-outline";

import type {
  WpPost,
  WpCategory,
  WpTag,
  WpAuthor,
  WpPage
} from "../types/wp-models";

import { ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { useMigrateFromWordPress } from "@/composables/use-migrate-from-wp";
import $ from 'cheerio';
import process from '../utils/wp-parser';

const res = useFileSystemAccess({
  dataType: "Text",
  types: [
    {
      description: "xml",
      accept: {
        "application/xml": [".xml"],
      },
    },
  ],
  excludeAcceptAllOption: true,
});

const loading = ref(false);

const wpPosts = ref<WpPost[]>([] as WpPost[]);
const wpPages = ref<WpPage[]>([] as WpPage[]);
const wpCategories = ref<WpCategory[]>([] as WpCategory[]);
const wpTags = ref<WpTag[]>([] as WpTag[]);
const wpAuthors = ref<WpAuthor[]>([] as WpAuthor[]);

const {
  createTagRequests,
  createCategoryRequests,
  createPostRequests,
  createPageRequests,
  createUserRequests,
} = useMigrateFromWordPress(
  wpTags,
  wpCategories,
  wpPosts,
  wpPages,
  wpAuthors,
);

async function handleOpenFile() {
  if (!res.isSupported) {
    Toast.warning("当前浏览器不支持选择文件，推荐使用 Google Chrome");
    return;
  }

  
  const { protocol, hostname } = location;

  // https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
  if (!["localhost", "127.0.0.1"].includes(hostname) && protocol === "http:") {
    Toast.warning("当前无法选择文件，站点必须使用 HTTPS 协议");
    return;
  }

  await res.open();

  const $wpxml = $.load(res.data.value as string, {
    decodeEntities: false,
    xmlMode: true,
    lowerCaseTags: true // needed to find `pubDate` tags
  });

  if (!$wpxml('channel > title').text()) {
    Toast.warning("解析 WordPress 站点名失败，所选文件不符合要求");
    return;
  }

  const wordPressVersion = $wpxml('channel > generator').text().match("v=(.*)")?.[1];


  if (wordPressVersion) {
    console.debug("上传的WordPress XML 文件由 %s 生成。", wordPressVersion);
  }

  const data = await process.processAll($wpxml);

  wpTags.value = data.wpTags;
  wpCategories.value = data.wpCategories;
  wpPosts.value = data.wpPosts;
  wpPages.value = data.wpPages;
  wpAuthors.value = data.wpAuthors;

}

const handleImport = async () => {

  window.onbeforeunload = function (e) {
    const message = "数据正在导入中，请勿关闭或刷新此页面。";
    e = e || window.event;
    if (e) {
      e.returnValue = message;
    }
    return message;
  };

  const tagCreateRequests = createTagRequests();

  try {
    await Promise.all(tagCreateRequests);
  } catch (error) {
    console.error("Failed to create tags", error);
  }


  loading.value = true;

  const categoryCreateRequests = createCategoryRequests();

  try {
    await Promise.all(categoryCreateRequests);
  } catch (error) {
    console.error("Failed to create categories", error);
  }

  const userCreateRequests = createUserRequests();
  try {
    await Promise.all(userCreateRequests);
  } catch (error) {
    console.error("Failed to create users", error);
  }

  const postCreateRequests = createPostRequests();
  try {
    await Promise.all(postCreateRequests);
  } catch (error) {
    console.error("Failed to create posts", error);
  }

  const pageCreateRequests = createPageRequests();
  try {
    await Promise.all(pageCreateRequests);
  } catch (error) {
    console.error("Failed to create pages", error);
  }

  loading.value = false;

  Dialog.success({
    title: "导入完成",
  });
};

onBeforeRouteLeave((to, from, next) => {
  if (loading.value) {
    Dialog.warning({
      title: "提示",
      description: "数据正在导入中，请勿关闭或刷新此页面。",
    });
    next(false);
  }
  next();
});
</script>
<template>
  <VPageHeader title="迁移">
    <template #icon>
      <MdiCogTransferOutline class="mr-2 self-center" />
    </template>

    <template #actions>
      <VSpace>
        <VButton @click="handleOpenFile" type="secondary">
          <template #icon>
            <MdiFileCodeOutline class="h-full w-full" />
          </template>
          选择文件
        </VButton>
      </VSpace>
    </template>
  </VPageHeader>
  <div class="p-4">
    <VEmpty v-if="!res.data.value" message="请选择 WordPress 中导出的 XML 数据文件" title="当前没有选择数据文件">
      <template #actions>
        <VSpace>
          <VButton @click="handleOpenFile">选择文件</VButton>
        </VSpace>
      </template>
    </VEmpty>
    <div class="migrate-flex migrate-flex-1 migrate-flex-col" v-else>
      <div class="migrate-grid migrate-grid-cols-1 migrate-gap-3 sm:migrate-grid-cols-4">
        <div class="migrate-h-96">
          <VCard :body-class="['h-full', '!p-0', 'overflow-y-auto']" class="h-full" :title="`标签（${wpTags.length}）`">
            <ul class="box-border h-full w-full divide-y divide-gray-100" role="list">
              <li v-for="(tag, index) in wpTags" :key="index">
                <VEntity>
                  <template #start>
                    <VEntityField :title="tag.name" :description="tag.slug"></VEntityField>
                  </template>
                </VEntity>
              </li>
            </ul>
          </VCard>
        </div>
        <div class="migrate-h-96">
          <VCard :body-class="['h-full', '!p-0', 'overflow-y-auto']" class="h-full"
            :title="`分类（${wpCategories.length}）`">
            <ul class="box-border h-full w-full divide-y divide-gray-100" role="list">
              <li v-for="(category, index) in wpCategories" :key="index">
                <VEntity>
                  <template #start>
                    <VEntityField :title="category.name" :description="category.slug"></VEntityField>
                  </template>
                </VEntity>
              </li>
            </ul>
          </VCard>
        </div>
        <div class="migrate-h-96">
          <VCard :body-class="['h-full', '!p-0', 'overflow-y-auto']" class="h-full" :title="`文章（${wpPosts.length}）`">
            <ul class="box-border h-full w-full divide-y divide-gray-100" role="list">
              <li v-for="(post, index) in wpPosts" :key="index">
                <VEntity>
                  <template #start>
                    <VEntityField :title="post.title" :description="post.description"></VEntityField>
                  </template>
                </VEntity>
              </li>
            </ul>
          </VCard>
        </div>
        <div class="migrate-h-96">
          <VCard :body-class="['h-full', '!p-0', 'overflow-y-auto']" class="h-full" :title="`自定义页面（${wpPages.length}）`">
            <ul class="box-border h-full w-full divide-y divide-gray-100" role="list">
              <li v-for="(page, index) in wpPages" :key="index">
                <VEntity>
                  <template #start>
                    <VEntityField :title="page.title" :description="page.description"></VEntityField>
                  </template>
                </VEntity>
              </li>
            </ul>
          </VCard>
        </div>        
        <div class="migrate-h-96">
          <VCard :body-class="['h-full', '!p-0', 'overflow-y-auto']" class="h-full" :title="`作者（${wpAuthors.length}）`">
            <ul class="box-border h-full w-full divide-y divide-gray-100" role="list">
              <li v-for="(author, index) in wpAuthors" :key="index">
                <VEntity>
                  <template #start>
                    <VEntityField :title="author.login" :description="author.displayName"></VEntityField>
                  </template>
                </VEntity>
              </li>
            </ul>
          </VCard>
        </div>        
      </div>
      <div class="migrate-mt-8 migrate-self-center">
        <VButton :loading="loading" type="secondary" @click="handleImport">
          执行导入
        </VButton>
      </div>
    </div>
  </div>
</template>
