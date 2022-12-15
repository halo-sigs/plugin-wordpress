import $, {
  type CheerioAPI,
  type Cheerio,
  type AnyNode,
  type BasicAcceptedElems,
} from "cheerio";

import type {
  WpPost,
  WpCategory,
  WpTag,
  WpAuthor,
  WpPage,
} from "../types/wp-models";

const processAll = async ($wpxml: CheerioAPI) => {
  let wpTags: WpTag[] = [];
  let wpCategories: WpCategory[] = [];
  let wpPosts: WpPost[] = [];
  let wpPages: WpPage[] = [];
  let wpAuthors: WpAuthor[] = [];

  let wpAttachments = await processAttachments($wpxml);

  // 处理分类和标签
  $wpxml("wp\\:term").map(async (i, term) => {
    const termTaxonomy = $(term).children("wp\\:term_taxonomy").text();

    switch (termTaxonomy) {
      case "post_tag":
        let wpTag = {
          id: $(term).children("wp\\:term_id").text(),
          name: decodeURI($(term).children("wp\\:term_name").text()),
          slug: decodeURI($(term).children("wp\\:term_slug").text()),
        } as WpTag;
        wpTags.push(wpTag);
        break;
      case "category":
        let wpCategory = {
          id: $(term).children("wp\\:term_id").text(),
          name: decodeURI($(term).children("wp\\:term_name").text()),
          slug: decodeURI($(term).children("wp\\:term_slug").text()),
          parent: decodeURI($(term).children("wp\\:term_parent").text()),
        } as WpCategory;
        wpCategories.push(wpCategory);
        break;
      default:
        break;
    }
  });

  $wpxml("item").find;

  // 处理文章和页面
  $wpxml("item").map(async (i, post) => {
    const postType = $(post).children("wp\\:post_type").text();

    if (["post"].includes(postType)) {
      let wpPost = {
        title: $(post).children("title").text(),
        id: $(post).children("wp\\:post_id").text(),
        pubDate: $(post).children("pubDate").text(),
        postDate: $(post).children("wp\\:post_date").text(),
        description: $(post).children("description").text(),
        content: $(post).children("content\\:encoded").text(),
        excerpt: $(post).children("excerpt\\:encoded").text(),
        commentStatus: $(post).children("wp\\:comment_status").text(),
        pingStatus: $(post).children("wp\\:ping_status").text(),
        postName: $(post).children("wp\\:post_name").text(),
        status: $(post).children("wp\\:status").text(),
        isSticky: $(post).children("wp\\:is_sticky").text(),
        categories: [] as WpCategory[],
        tags: [] as WpTag[],
        creator: $(post).children("dc\\:creator").text(),
        thumbnail: "",
      } as WpPost;
      // 获取文章的标签和分类信息
      if ($(post).children("category").length >= 1) {
        $(post)
          .children("category")
          .each((i, taxonomy) => {
            // `category` takes priority and is use as the primary tag, so gets added to the list first
            if ($(taxonomy).attr("domain") === "category") {
              let wpCategory = wpCategories.find(
                (item) =>
                  item.slug ===
                  decodeURI($(taxonomy).attr("nicename") as string)
              );
              if (wpCategory) {
                wpPost.categories.push(wpCategory);
              }
            } else if ($(taxonomy).attr("domain") === "post_tag") {
              let wpTag = wpTags.find(
                (item) =>
                  item.slug ===
                  decodeURI($(taxonomy).attr("nicename") as string)
              );
              if (wpTag) {
                wpPost.tags.push(wpTag);
              }
            }
          });
      }
      // 获取文章封面图片URL
      let attachmentData = processFeatureImage(post, wpAttachments);
      wpPost.thumbnail = attachmentData ? attachmentData.url : "";

      wpPosts.push(wpPost);
    } else if (["page"].includes(postType)) {
      let wpPage = {
        title: $(post).children("title").text(),
        id: $(post).children("wp\\:post_id").text(),
        pubDate: $(post).children("pubDate").text(),
        postDate: $(post).children("wp\\:post_date").text(),
        description: $(post).children("description").text(),
        content: $(post).children("content\\:encoded").text(),
        excerpt: $(post).children("excerpt\\:encoded").text(),
        commentStatus: $(post).children("wp\\:comment_status").text(),
        pingStatus: $(post).children("wp\\:ping_status").text(),
        postName: $(post).children("wp\\:post_name").text(),
        status: $(post).children("wp\\:status").text(),
        isSticky: $(post).children("wp\\:is_sticky").text(),
        creator: $(post).children("dc\\:creator").text(),
      } as WpPage;
      wpPages.push(wpPage);
    }
  });

  // 处理作者（用户）
  $wpxml("wp\\:author").map(async (i, author) => {
    wpAuthors.push({
      login: decodeURI($(author).children("wp\\:author_login").text()),
      email: decodeURI($(author).children("wp\\:author_email").text()),
      displayName: decodeURI(
        $(author).children("wp\\:author_display_name").text()
      ),
    } as WpAuthor);
  });

  return {
    wpTags,
    wpCategories,
    wpPosts,
    wpAuthors,
    wpPages,
  };
};

const processFeatureImage = ($post, attachments) => {
  let thumbnailId = null;

  $($post)
    .find("wp\\:postmeta")
    .each((i, row) => {
      let key = $(row).find("wp\\:meta_key").text();
      let val = $(row).find("wp\\:meta_value").text();

      if (key === "_thumbnail_id") {
        thumbnailId = val;
      }
    });

  if (!thumbnailId) {
    return false;
  }

  const attachmentData = attachments.find((item) => item.id === thumbnailId);

  return attachmentData;
};

const processAttachment = async ($post) => {
  let attachmentKey = $($post).find("wp\\:post_id").text();
  let attachmentUrl = $($post).find("wp\\:attachment_url").text() || null;
  let attachmentDesc = $($post).find("content\\:encoded").text() || null;
  let attachmentAlt = null;

  $($post)
    .find("wp\\:postmeta")
    .each((i, row) => {
      let metaKey = $(row).find("wp\\:meta_key").text();
      let metaVal = $(row).find("wp\\:meta_value").text();

      if (metaKey === "_wp_attachment_image_alt") {
        attachmentAlt = metaVal;
      }
    });

  return {
    id: attachmentKey,
    url: attachmentUrl,
    description: attachmentDesc,
    alt: attachmentAlt,
  };
};

const processAttachments = async ($xml) => {
  let attachmentsOutput = [];

  let posts = $xml("item")
    .map(async (i, post) => {
      const postType = $(post).children("wp\\:post_type").text();

      if (["attachment"].includes(postType)) {
        attachmentsOutput.push(await processAttachment(post));
      }
    })
    .get();

  await Promise.all(posts);

  return attachmentsOutput;
};

export default {
  processAll,
};
