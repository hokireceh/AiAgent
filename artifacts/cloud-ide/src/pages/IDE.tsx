import { IdeProvider } from "@/lib/ide-context";
import { IdeLayout } from "@/components/ide/IdeLayout";

export default function IDEPage() {
  return (
    <IdeProvider>
      <IdeLayout />
    </IdeProvider>
  );
}
