import {
  Bell,
  CheckCheck,
  X,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    dismiss,
  } = useNotifications();

  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead([notification.id]);
    }

    // Show full details in dialog
    setSelectedNotification(notification);
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await markAllAsRead();
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-accent"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-semibold animate-pulse"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
            {!isConnected && (
              <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 bg-yellow-500 rounded-full border-2 border-background animate-pulse" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] p-0 shadow-xl" align="end">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs hover:bg-primary/10 gap-1"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>
          <ScrollArea className="h-[480px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <div className="rounded-full bg-muted p-4 mb-3">
                  <Bell className="h-8 w-8" />
                </div>
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  You're all caught up!
                </p>
              </div>
            ) : (
              <div>
                {notifications.map((notification, index) => (
                  <div key={notification.id}>
                    <NotificationItem
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      onDismiss={() => dismiss([notification.id])}
                    />
                    {index < notifications.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          {!isConnected && (
            <div className="px-4 py-2.5 bg-yellow-50 dark:bg-yellow-950 border-t border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
              Reconnecting to notification server...
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Notification Detail Dialog */}
      <NotificationDetailDialog
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
      />
    </>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onDismiss: () => void;
}

function NotificationItem({
  notification,
  onClick,
  onDismiss,
}: NotificationItemProps) {
  const getSeverityConfig = (severity: string) => {
    const configs = {
      INFO: {
        icon: Info,
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        borderColor: "border-l-blue-500",
        iconColor: "text-blue-600 dark:text-blue-400",
        badgeVariant: "default" as const,
        badgeBg:
          "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
      },
      SUCCESS: {
        icon: CheckCircle,
        bgColor: "bg-green-50 dark:bg-green-950/30",
        borderColor: "border-l-green-500",
        iconColor: "text-green-600 dark:text-green-400",
        badgeVariant: "default" as const,
        badgeBg:
          "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
      },
      WARNING: {
        icon: AlertTriangle,
        bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
        borderColor: "border-l-yellow-500",
        iconColor: "text-yellow-600 dark:text-yellow-400",
        badgeVariant: "secondary" as const,
        badgeBg:
          "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300",
      },
      ERROR: {
        icon: XCircle,
        bgColor: "bg-red-50 dark:bg-red-950/30",
        borderColor: "border-l-red-500",
        iconColor: "text-red-600 dark:text-red-400",
        badgeVariant: "destructive" as const,
        badgeBg: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",
      },
      CRITICAL: {
        icon: AlertCircle,
        bgColor: "bg-red-100 dark:bg-red-950/50",
        borderColor: "border-l-red-700",
        iconColor: "text-red-700 dark:text-red-400",
        badgeVariant: "destructive" as const,
        badgeBg: "bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200",
      },
    };
    return configs[severity as keyof typeof configs] || configs.INFO;
  };

  const config = getSeverityConfig(notification.severity);
  const SeverityIcon = config.icon;

  return (
    <div
      className={cn(
        "px-4 py-3.5 hover:bg-accent/50 cursor-pointer transition-all duration-200 border-l-4",
        !notification.read ? config.bgColor : "bg-muted/20",
        config.borderColor,
        notification.read && "opacity-60"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Severity Icon */}
        <div className={cn("flex-shrink-0 mt-0.5", config.iconColor)}>
          <SeverityIcon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            {!notification.read && (
              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 animate-pulse" />
            )}
            <h4 className="font-semibold text-sm leading-tight flex-1">
              {notification.title}
            </h4>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {notification.message}
          </p>

          <div className="flex items-center gap-2 pt-1">
            <Badge className={cn("text-xs font-medium", config.badgeBg)}>
              {notification.severity}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/40" />
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>

        {/* Dismiss Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-destructive/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface NotificationDetailDialogProps {
  notification: Notification | null;
  onClose: () => void;
}

function NotificationDetailDialog({
  notification,
  onClose,
}: NotificationDetailDialogProps) {
  if (!notification) return null;

  const getSeverityConfig = (severity: string) => {
    const configs = {
      INFO: {
        icon: Info,
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        iconColor: "text-blue-600 dark:text-blue-400",
        badgeBg:
          "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
      },
      SUCCESS: {
        icon: CheckCircle,
        bgColor: "bg-green-50 dark:bg-green-950/30",
        iconColor: "text-green-600 dark:text-green-400",
        badgeBg:
          "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
      },
      WARNING: {
        icon: AlertTriangle,
        bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
        iconColor: "text-yellow-600 dark:text-yellow-400",
        badgeBg:
          "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300",
      },
      ERROR: {
        icon: XCircle,
        bgColor: "bg-red-50 dark:bg-red-950/30",
        iconColor: "text-red-600 dark:text-red-400",
        badgeBg: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",
      },
      CRITICAL: {
        icon: AlertCircle,
        bgColor: "bg-red-100 dark:bg-red-950/50",
        iconColor: "text-red-700 dark:text-red-400",
        badgeBg: "bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200",
      },
    };
    return configs[severity as keyof typeof configs] || configs.INFO;
  };

  const config = getSeverityConfig(notification.severity);
  const SeverityIcon = config.icon;

  return (
    <Dialog open={!!notification} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={cn("flex-shrink-0 mt-0.5", config.iconColor)}>
              <SeverityIcon className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-2">
              <DialogTitle className="text-xl">
                {notification.title}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Badge className={cn("text-xs font-medium", config.badgeBg)}>
                  {notification.severity}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <DialogDescription className="text-base leading-relaxed whitespace-pre-wrap">
            {notification.message}
          </DialogDescription>

          {notification.metadata &&
            Object.keys(notification.metadata).length > 0 && (
              <div className={cn("rounded-lg p-4 space-y-3", config.bgColor)}>
                <h4 className="font-semibold text-sm">Additional Details</h4>
                <div className="space-y-3">
                  {/* Shipment ID - Always show first if present */}
                  {(notification.shipmentId ||
                    notification.metadata.shipment_id) && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        Shipment ID
                      </span>
                      <div className="relative group cursor-pointer">
                        <p className="font-mono text-xs bg-gradient-to-br from-background to-muted/20 px-3 py-2.5 rounded-lg border-2 border-border/50 shadow-sm break-all select-all hover:border-primary/60 hover:shadow-md transition-all duration-200">
                          {notification.shipmentId ||
                            notification.metadata.shipment_id}
                        </p>
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {/* Segment ID - Show if present */}
                  {notification.segmentId && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        Segment ID
                      </span>
                      <div className="relative group cursor-pointer">
                        <p className="font-mono text-xs bg-gradient-to-br from-background to-muted/20 px-3 py-2.5 rounded-lg border-2 border-border/50 shadow-sm break-all select-all hover:border-primary/60 hover:shadow-md transition-all duration-200">
                          {notification.segmentId}
                        </p>
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {/* Consumer and Manufacturer Names - Show separately if present */}
                  {(notification.metadata.consumer_name ||
                    notification.metadata.manufacturer_name) && (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/30">
                      {notification.metadata.consumer_name && (
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground font-medium capitalize">
                            Consumer Name
                          </span>
                          <p className="text-sm font-semibold break-words leading-tight">
                            {notification.metadata.consumer_name}
                          </p>
                        </div>
                      )}
                      {notification.metadata.manufacturer_name && (
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground font-medium capitalize">
                            Manufacturer Name
                          </span>
                          <p className="text-sm font-semibold break-words leading-tight">
                            {notification.metadata.manufacturer_name}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Other metadata in organized grid */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/30">
                    {/* Show start_checkpoint first */}
                    {notification.metadata.start_checkpoint && (
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground font-medium capitalize">
                          Start Checkpoint
                        </span>
                        <p className="text-sm font-semibold break-words leading-tight">
                          {notification.metadata.start_checkpoint}
                        </p>
                      </div>
                    )}
                    {/* Then show end_checkpoint */}
                    {notification.metadata.end_checkpoint && (
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground font-medium capitalize">
                          End Checkpoint
                        </span>
                        <p className="text-sm font-semibold break-words leading-tight">
                          {notification.metadata.end_checkpoint}
                        </p>
                      </div>
                    )}
                    {/* Show all other metadata */}
                    {Object.entries(notification.metadata)
                      .filter(
                        ([key]) =>
                          !key.includes("uuid") &&
                          !key.includes("_id") &&
                          key !== "action" &&
                          key !== "manufacturer_name" &&
                          key !== "consumer_name" &&
                          key !== "start_checkpoint" &&
                          key !== "end_checkpoint"
                      )
                      .map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <span className="text-xs text-muted-foreground font-medium capitalize">
                            {key.replace(/_/g, " ")}
                          </span>
                          <p className="text-sm font-semibold break-words leading-tight">
                            {formatMetadataValue(key, value)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to format metadata values
function formatMetadataValue(key: string, value: any): string {
  if (value === null || value === undefined) return "N/A";

  // Format dates
  if (key.includes("date") || key.includes("at")) {
    try {
      return new Date(value).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return String(value);
    }
  }

  // Format objects
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}
