import { updateFamily } from "../../actions";
import { SubmitButton } from "@/components/SubmitButton";
import ManageFamilyFields from "./ManageFamilyFields";
import { Card } from "@/components/card";

export default function ServerForm({ family }: { family: any }) {
  // Debug: confirm server
  console.log("ServerForm is server:", typeof window === "undefined");

  return (
    // 👉 The <form> is created in a SERVER component and directly binds the server action
    <form action={updateFamily.bind(null, family.id)} className="space-y-4">
      <Card className="p-4">
        <ManageFamilyFields family={family} />{" "}
        {/* client component INSIDE form is OK */}
        <div className="mt-4">
          <SubmitButton />
        </div>
      </Card>
    </form>
  );
}
