import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
    unsavedChangesWarning: false,
})
export default function ClerkAndConvexProvider({children}: {children: React.ReactNode}) {
  return (
      <ClerkProvider tokenCache={tokenCache}>
          <ConvexProviderWithClerk useAuth={useAuth} client={convex}>
              <ClerkLoaded>
                  {children}
              </ClerkLoaded>
          </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}