'use client';

/**
 * B-6: the shelter staff console.
 *
 * **This page could only ever be empty.** It read the partner id from a query string — `?partner=`
 * — and nothing in the app ever produced such a link, so every shelter admin who had ever been
 * registered saw "No shelter linked to this account". The console behind it was complete the whole
 * time; there was simply no way for it to learn which shelter it belonged to.
 *
 * It now asks the server. The query parameter is still honoured, because an admin debugging a
 * specific partner benefits from it, but nobody needs one to use the page.
 */
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { TabPage } from '@/components/layout/TabPage';
import { Banner } from '@/components/feedback/Banner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ShelterConsole } from '@/features/shelter';
import { useMyShelter } from '@/features/shelter/hooks/useShelter';

function Console() {
  const params = useSearchParams();
  const override = params.get('partner');
  const { data, isLoading } = useMyShelter({ enabled: !override });

  if (override) return <ShelterConsole partnerId={override} />;
  if (isLoading) return <Skeleton $h="220px" $radius={16} />;

  if (!data) {
    return (
      <EmptyState
        icon="🏠"
        title="No shelter linked to this account"
        description="Ask a StreetServe admin to register your organisation as a partner."
      />
    );
  }

  return (
    <>
      {/*
        A suspended partner keeps its existing residents and still owes them whatever it holds, but
        takes nobody new. Saying so beats letting them discover it when enrolment fails.
      */}
      {data.status === 'suspended' ? (
        <Banner tone="warning" title="This partnership is suspended">
          You can still hand over money you are holding, but you cannot enrol new residents. Contact
          StreetServe to resolve it.
        </Banner>
      ) : null}
      {/*
        The first thing a newly approved shelter sees. They have just been told they can enrol
        residents and have never used this screen — a bare empty console with no explanation is
        where that momentum dies.
      */}
      {data.residentsEnrolled === 0 ? (
        <Banner tone="info" title={`${data.organizationName} is approved`}>
          Enrol your first resident below. Each one gets a code to enter in the app, which links
          their account to your shelter — you do not need their details to start.
        </Banner>
      ) : null}
      <ShelterConsole partnerId={data.id} />
    </>
  );
}

export default function ShelterConsolePage() {
  return (
    <TabPage title="Shelter program">
      <Suspense fallback={null}>
        <Console />
      </Suspense>
    </TabPage>
  );
}
