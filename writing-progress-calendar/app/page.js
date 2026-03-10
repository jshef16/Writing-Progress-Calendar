import Image from "next/image";
import styles from "./page.module.css";
import ActivityCalendar from "./components/ActivityCalendar";


export const metadata = {
  title: "Activity Calendar",
  description: "A calendar heatmap showing your writing activity over the past year.",
};

export default function Home() {
  return <ActivityCalendar />;
}