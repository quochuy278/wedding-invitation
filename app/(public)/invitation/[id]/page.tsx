"use client";

import { use } from "react";

export default function InvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return <h1>Hello World {id}</h1>;
}
