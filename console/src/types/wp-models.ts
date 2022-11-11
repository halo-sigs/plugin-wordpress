export interface WpPost {
    title: string;
    id: string;
    pubDate: string;
    postDate: string;
    description: string;
    content: string;
    excerpt: string;
    commentStatus: "closed";
    pingStatus: string;
    postName: string;
    status: "publish" | "draft" | "trash";
    isSticky: "0" | "1";
    categories: WpCategory[];
    tags: WpTag[];
    thumbnail: string;
    creator: string;
  }
  
export interface WpCategory {
    id: string;
    slug: string;
    parent: string;
    name: string;
}

export interface WpTag {
    id: string;
    slug: string;
    name: string;
}

export interface WpAuthor {
    login: string;
    email: string;
    displayName: string;
}