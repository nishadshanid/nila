import { Suspense } from "react";
import type { Metadata } from "next";
import { getHousehold } from "@/lib/household";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPointRules } from "@/lib/points-data";
import { ProfileForm } from "./profile-form";
import { RulesForm } from "./rules-form";
import { NotificationsForm } from "./notifications-form";
import { emailConfigured } from "@/lib/email";
import { InstallApp } from "@/components/pwa/install-app";
import { ThemePicker } from "@/components/theme-picker";
import { pushConfigured } from "@/lib/push";
import { PushSettings } from "./push-settings";
import { NudgeTimesForm } from "./nudge-times-form";

export const metadata: Metadata = { title: "Settings" };

async function Profile() {
  const { me } = await getHousehold();
  return <ProfileForm profile={me} />;
}

async function Notifications() {
  const { me } = await getHousehold();
  return (
    <div className="flex flex-col gap-6">
      <NotificationsForm profile={me} emailReady={emailConfigured()} />
      <div className="border-t pt-6">
        <PushSettings enabled={me.push_notifications} serverReady={pushConfigured()} />
      </div>
      <div className="border-t pt-6">
        <NudgeTimesForm times={me.nudge_times ?? []} enabled={me.push_notifications} />
      </div>
    </div>
  );
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
          <CardTitle>App</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ThemePicker />
          <InstallApp />
        </CardContent>
      </Card>
      <Card className="mt-6 max-w-lg">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="bg-muted h-32 animate-pulse rounded" />}>
            <Notifications />
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
