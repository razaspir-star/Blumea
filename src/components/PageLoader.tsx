import BlumeaFlowerLoader from "@/components/BlumeaFlowerLoader";

// Lighter loader for inside the signed-in shell: the sidebar/header from
// AppShell stay mounted and only this content area shows the wait.
export default function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <BlumeaFlowerLoader size={56} />
    </div>
  );
}
