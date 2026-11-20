// Owner: learn. `/learn/[id]`, the guide page of a learning step and the completion celebration (spec 3.11). A thin
// Server Component: the tab title is the guide's («دليل Power BI»); an unknown id renders the not-found block (in the screen).
import type { Metadata } from "next";

import { CourseScreen } from "@/features/learn";
import { guideTitle } from "@/lib/copy";
import { PAGE_HEADINGS, asCourseId, pageTitle } from "@/lib/routes";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const courseId = asCourseId(id);
  return { title: { absolute: pageTitle(courseId ? guideTitle(courseId) : PAGE_HEADINGS.learn) } };
}

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CourseScreen id={id} key={id} />;
}
