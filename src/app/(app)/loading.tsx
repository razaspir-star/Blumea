import PageLoader from "@/components/PageLoader";

// Nested inside the (app) layout, so the sidebar (rendered by AppShell) stays
// on screen while a page inside it is still loading.
export default function Loading() {
  return <PageLoader />;
}
