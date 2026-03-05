import Image from "next/image";
import styles from "./page.module.css";
import ActivityCalendar from "./components/ActivityCalendar";

export default function Home() {
  return <ActivityCalendar />;
}