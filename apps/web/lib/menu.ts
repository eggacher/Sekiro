import type { Menu } from "@sekiro/shared";

/**
 * 通过路径反查面包屑（从 auth store 的 menus 中查找）
 */
export function findBreadcrumb(
  menus: Menu[],
  pathname: string
): { title: string; href: string }[] {
  const crumbs: { title: string; href: string }[] = [];

  function dfs(items: Menu[]): boolean {
    for (const item of items) {
      if (item.path === pathname) {
        crumbs.push({ title: item.title, href: item.path ?? "#" });
        return true;
      }
      if (item.children && item.children.length > 0) {
        if (dfs(item.children)) {
          crumbs.unshift({ title: item.title, href: item.path ?? "#" });
          return true;
        }
      }
    }
    return false;
  }

  dfs(menus);
  return crumbs;
}
