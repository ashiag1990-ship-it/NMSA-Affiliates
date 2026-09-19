import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TrainingFlow } from "./TrainingFlow";

export default async function TrainingPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.userType !== "affiliate") redirect("/affiliate/login");

  const training = await prisma.affiliateTraining.findUnique({ where: { affiliateId: session.user.id } });

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto rounded-xl2 bg-white shadow-premium-lg p-6 sm:p-10">
        <TrainingFlow
          startSlide={training?.currentSlide ?? 1}
          alreadyCompleted={training?.trainingCompleted ?? false}
        />
      </div>
    </main>
  );
}
