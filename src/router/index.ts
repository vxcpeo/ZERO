import { createRouter, createWebHashHistory, type RouteRecordRaw } from "vue-router";

/**
 * Hash history keeps deep links working on static hosts (IPFS, S3, GitHub Pages) without a
 * rewrite rule, which matters for a dApp that may be pinned to IPFS.
 */
const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("@/views/HomeView.vue"),
    meta: { title: "Fractio — own art, mine the fees" },
  },
  {
    path: "/mine",
    name: "mine",
    component: () => import("@/views/MineView.vue"),
    meta: { title: "Mine fees" },
  },
  {
    path: "/art",
    name: "art",
    component: () => import("@/views/ArtView.vue"),
    meta: { title: "Artworks" },
  },
  {
    path: "/art/:id",
    name: "artwork",
    component: () => import("@/views/ArtworkDetailView.vue"),
    meta: { title: "Artwork" },
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: () => import("@/views/DashboardView.vue"),
    meta: { title: "Dashboard" },
  },
  {
    path: "/docs",
    name: "docs",
    component: () => import("@/views/DocsView.vue"),
    meta: { title: "How it works" },
  },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.afterEach((to) => {
  const title = to.meta?.title;
  if (typeof title === "string") document.title = title;
});
