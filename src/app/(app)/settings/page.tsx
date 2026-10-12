import { Suspense } from "react";
import type { Metadata } from "next";
import { getHousehold } from "@/lib/household";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPointRules } from "@/lib/points-data";
import { ProfileForm } from "./profile-form";
import { RulesForm } from "./rules-form";

export const metadata: Metadata = { title: "Settings" };

async function Profile() {
  const { me } = await getHousehold();
  return <ProfileForm profile={me} />;
}

async function Rules() {
  return <RulesForm rules={await getPointRules()} />;
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="bg-muted h-48 animate-pulse rounded" />}>
            <Profile />
          </Suspense>
        </CardContent>
      </Card>
      <Card className="mt-6 max-w-lg">
        <CardHeader>
          <CardTitle>Points</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="bg-muted h-40 animate-pulse rounded" />}>
            <Rules />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}
