import { Redirect } from "expo-router";

// The «ثبت» tab opens the log sheet from its tabPress listener; reaching this route directly does the same.
export default function Add() {
  return <Redirect href="/log" />;
}
