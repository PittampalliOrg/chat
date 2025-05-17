// components/model-selector.tsx
'use client';

import { startTransition, useMemo, useOptimistic, useState, useEffect } from 'react'; // Added useEffect for potential use
import type { Session } from 'next-auth'; // Assuming Session type is imported or available globally via augmentation

import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { chatModels as defaultChatModels, type ChatModel } from '@/lib/ai/models'; // Assuming ChatModel type export
import { cn } from '@/lib/utils';
import { entitlementsByUserType } from '@/lib/ai/entitlements'; // Assuming UserType export
import type { UserType } from '@/app/(auth)/auth';

import { CheckCircleFillIcon, ChevronDownIcon } from './icons'; // Assuming these are local icons

// Define Props interface for clarity if not already done elsewhere
interface ModelSelectorProps extends React.ComponentProps<typeof Button> {
  session: Session; // Use the augmented Session type from next-auth
  selectedModelId: string;
  // className is already part of ComponentProps<typeof Button>
}

export function ModelSelector({
  session,
  selectedModelId,
  className,
  ...buttonProps // Spread other button props
}: ModelSelectorProps) {
  // === RULE OF HOOKS: Call ALL hooks at the top level, unconditionally ===
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] = useOptimistic(selectedModelId);

  // Memoize derived data based on session and other props.
  // The logic inside useMemo will handle cases where session.user might be undefined.
  const { userType, availableChatModels, selectedChatModelDetails } = useMemo(() => {
    if (!session || !session.user) {
      // Handle default/guest case if session or session.user is not available
      // You might want to define default entitlements for guests
      const guestUserType: UserType = 'guest'; // Or handle as truly unauthenticated
      const guestEntitlements = entitlementsByUserType[guestUserType] || { availableChatModelIds: [] };
      const guestAvailableModels = defaultChatModels.filter((chatModel) =>
        guestEntitlements.availableChatModelIds.includes(chatModel.id),
      );
      const guestSelectedModel = guestAvailableModels.find(
        (model) => model.id === optimisticModelId
      ) || guestAvailableModels[0]; // Fallback to first guest model or undefined

      return {
        userType: guestUserType,
        availableChatModels: guestAvailableModels,
        selectedChatModelDetails: guestSelectedModel,
      };
    }

    // If session.user exists
    const currentUserType = session.user.type as UserType; // Assuming session.user.type is always valid UserType
    const userEntitlements = entitlementsByUserType[currentUserType] || { availableChatModelIds: [] };
    const userAvailableModels = defaultChatModels.filter((chatModel) =>
      userEntitlements.availableChatModelIds.includes(chatModel.id),
    );
    const currentSelectedModel = userAvailableModels.find(
      (model) => model.id === optimisticModelId
    ) || userAvailableModels[0]; // Fallback to first available model or undefined

    return {
      userType: currentUserType,
      availableChatModels: userAvailableModels,
      selectedChatModelDetails: currentSelectedModel,
    };
  }, [session, optimisticModelId]); // Dependencies for useMemo

  // === End of Hook Calls ===

  // Conditional rendering: If after hooks, we determine there's no user
  // and no models to show (or some other critical condition), we can return early.
  // This specific early return was the cause of the original error for hooks.
  // Now, if session.user is null/undefined, useMemo above handles it by potentially
  // returning guest models or an empty list.
  // If you truly want to render *nothing* when no session.user:
  if (!session || !session.user) {
     console.warn("[ModelSelector] No session.user. Rendering null or a fallback UI.");
     // Depending on desired UX, you might return null or a disabled selector / prompt to log in.
     // For this example, we'll let it render with guest/default models if useMemo provides them.
     // If availableChatModels is empty from useMemo, the dropdown will be empty.
     // If you want to return null here, ensure hooks above don't depend on logic *after* this null.
     // return null; // Example: render nothing if no session user.
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button
          data-testid="model-selector"
          variant="outline"
          className="md:px-2 md:h-[34px]"
          {...buttonProps} // Spread other button props
        >
          {selectedChatModelDetails?.name || 'Select Model'} {/* Fallback text */}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px]">
        {availableChatModels.map((chatModel: ChatModel) => { // Ensure chatModel is typed
          const { id } = chatModel;

          return (
            <DropdownMenuItem
              data-testid={`model-selector-item-${id}`}
              key={id}
              onSelect={() => {
                setOpen(false);
                startTransition(() => {
                  setOptimisticModelId(id);
                  saveChatModelAsCookie(id);
                });
              }}
              data-active={id === optimisticModelId} // Use optimisticModelId for active state
              asChild
            >
              <button
                type="button"
                className="gap-4 group/item flex flex-row justify-between items-center w-full"
              >
                <div className="flex flex-col gap-1 items-start">
                  <div>{chatModel.name}</div>
                  {chatModel.description && ( // Check if description exists
                    <div className="text-xs text-muted-foreground">
                      {chatModel.description}
                    </div>
                  )}
                </div>
                <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                  <CheckCircleFillIcon />
                </div>
              </button>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}