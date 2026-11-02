// 顶栏「友链」下拉卡片的数据：朋友们的站点。
// 头像已下载到 public/friends/ 自托管（原图床经两跳重定向且单张 350K+，外链不可靠）。
export interface FriendLink {
  name: string;
  link: string;
  avatar: string;
  descr: string;
}

export const friends: FriendLink[] = [
  {
    name: "Just.ok",
    link: "https://blog.just-ok.xyz/",
    avatar: "/friends/just-ok.jpg",
    descr: "今日事，今日毕。",
  },
  {
    name: "qinghuidaqzp",
    link: "https://qinghuidaqzp.github.io/",
    avatar: "/friends/qinghuidaqzp.jpg",
    descr: "This is my Blog",
  },
];
