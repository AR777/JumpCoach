import { router } from "expo-router";
import { Button, Screen, Title } from "../components/ui";

export default function NotFound() {
  return (
    <Screen>
      <Title>That page is not on the sheet</Title>
      <Button label="Team sheet" onPress={() => router.replace("/")} />
    </Screen>
  );
}
