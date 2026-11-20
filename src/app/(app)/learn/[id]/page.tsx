// Owner: learn. `/learn/[id]`, the course page and the completion celebration (spec 3.11). A thin Server Component:
// the tab title is the SHORT course title (spec 2.2); an unknown id renders the shell's not-found block (in the screen).
import type { Metadata } from "next";

import { CourseScreen } from "@/features/learn";
import { getCourse } from "@/lib/data";
import { shortTitle } from "@/lib/engine";
import { PAGE_HEADINGS, asCourseId, pageTitle } from "@/lib/routes";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const courseId = asCourseId(id);
  return { title: { absolute: pageTitle(courseId ? shortTitle(getCourse(courseId)) : PAGE_HEADINGS.learn) } };
}

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CourseScreen id={id} key={id} />;
}
