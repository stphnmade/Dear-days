import { updateFamily } from "../../actions";
import { SubmitButton } from "@/components/SubmitButton";
import ManageFamilyFields from "./ManageFamilyFields";
import { Card } from "@/components/card";

export default function ServerForm({ family }: { family: any }) {
  return (
    <form action={updateFamily.bind(null, family.id)} className="space-y-4">
      <Card className="p-4">
        <ManageFamilyFields family={family} />
        <div className="mt-4">
          <SubmitButton />
        </div>
      </Card>
    </form>
  );
}
