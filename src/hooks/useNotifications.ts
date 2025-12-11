import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

export type NotificationType =
  | "SHIPMENT_CREATED"
  | "SHIPMENT_ACCEPTED"
  | "SHIPMENT_IN_TRANSIT"
  | "SHIPMENT_DELIVERED"
  | "SHIPMENT_CANCELLED"
  | "SEGMENT_CREATED"
  | "SEGMENT_ASSIGNED"
  | "SEGMENT_ACCEPTED"
  | "SEGMENT_TAKEOVER"
  | "SEGMENT_HANDOVER"
  | "SEGMENT_DELIVERED"
  | "PACKAGE_CREATED"
  | "PACKAGE_ACCEPTED"
  | "PACKAGE_DELIVERED"
  | "CONDITION_BREACH"
  | "TEMPERATURE_BREACH"
  | "TIME_BREACH"
  | "SYSTEM_ALERT"
  | "USER_MENTION";

export type NotificationSeverity =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | "CRITICAL";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  shipmentId: string | null;
  segmentId: string | null;
  packageId: string | null;
  breachId: string | null;
  metadata: Record<string, any>;
  read: boolean;
  readAt: string | null;
  dismissed: boolean;
  dismissedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface NotificationPreferences {
  userId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  enabledTypes: NotificationType[];
  disabledTypes: NotificationType[];
  minSeverity: NotificationSeverity;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function fetchNotifications(params: {
  token: string;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
  type?: NotificationType;
  severity?: NotificationSeverity;
}) {
  const queryParams = new URLSearchParams();
  if (params.unreadOnly) queryParams.set("unreadOnly", "true");
  if (params.limit) queryParams.set("limit", params.limit.toString());
  if (params.offset) queryParams.set("offset", params.offset.toString());
  if (params.type) queryParams.set("type", params.type);
  if (params.severity) queryParams.set("severity", params.severity);

  const response = await fetch(
    `${API_URL}/api/notifications?${queryParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${params.token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }

  return response.json();
}

async function fetchUnreadCount(token: string): Promise<{ count: number }> {
  const response = await fetch(`${API_URL}/api/notifications/unread-count`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch unread count");
  }

  return response.json();
}

async function markAsRead(token: string, notificationIds: string[]) {
  const response = await fetch(`${API_URL}/api/notifications/read`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ notificationIds }),
  });

  if (!response.ok) {
    throw new Error("Failed to mark as read");
  }

  return response.json();
}

async function markAllAsRead(token: string) {
  const response = await fetch(`${API_URL}/api/notifications/read-all`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to mark all as read");
  }

  return response.json();
}

async function dismissNotifications(token: string, notificationIds: string[]) {
  const response = await fetch(`${API_URL}/api/notifications/dismiss`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ notificationIds }),
  });

  if (!response.ok) {
    throw new Error("Failed to dismiss notifications");
  }

  return response.json();
}

// ============================================================================
// WEBSOCKET HOOK
// ============================================================================

function useWebSocket(url: string, token: string | null, enabled: boolean) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!enabled || !token) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connected");
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Authenticate
        ws.send(
          JSON.stringify({
            type: "AUTH",
            token,
          })
        );
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      };

      ws.onclose = () => {
        console.log("🔌 WebSocket disconnected");
        setIsConnected(false);
        wsRef.current = null;

        // Reconnect with exponential backoff
        if (enabled) {
          const delay = Math.min(
            1000 * 2 ** reconnectAttemptsRef.current,
            30000
          );
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(
              `🔄 Reconnecting WebSocket (attempt ${reconnectAttemptsRef.current})...`
            );
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
    }
  }, [url, token, enabled]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected, lastMessage };
}

// ============================================================================
// MAIN NOTIFICATION HOOK
// ============================================================================

export function useNotifications() {
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();

  // WebSocket connection
  const WS_URL =
    (import.meta.env.VITE_WS_URL || "ws://localhost:5000") +
    "/ws/notifications";
  const { isConnected, lastMessage } = useWebSocket(WS_URL, token, !!token);

  // Fetch notifications
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      fetchNotifications({
        token: token!,
        limit: 50,
      }),
    enabled: !!token,
    staleTime: 30000,
  });

  // Fetch unread count
  const { data: unreadCountData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => fetchUnreadCount(token!),
    enabled: !!token,
    refetchInterval: 60000, // Refresh every minute
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationIds: string[]) =>
      markAsRead(token!, notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread-count"],
      });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllAsRead(token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread-count"],
      });
    },
  });

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: (notificationIds: string[]) =>
      dismissNotifications(token!, notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === "NEW_NOTIFICATION") {
      const notification: Notification = lastMessage.data;

      // Show enhanced toast notification
      const severityIcons = {
        INFO: "ℹ️",
        SUCCESS: "✅",
        WARNING: "⚠️",
        ERROR: "❌",
        CRITICAL: "🚨",
      };

      const toastVariant = getSeverityToastVariant(notification.severity);
      const icon = severityIcons[notification.severity];

      toast[toastVariant](`${icon} ${notification.title}`, {
        description: notification.message,
        duration: notification.severity === "CRITICAL" ? 10000 : 5000,
        action:
          notification.shipmentId || notification.segmentId
            ? {
                label: "View",
                onClick: () => {
                  // TODO: Navigate to related entity
                  console.log("Navigate to:", {
                    shipmentId: notification.shipmentId,
                    segmentId: notification.segmentId,
                    packageId: notification.packageId,
                  });
                },
              }
            : undefined,
      });

      // Invalidate queries to refresh notification list
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread-count"],
      });
    } else if (lastMessage.type === "UNREAD_COUNT") {
      // Update unread count
      queryClient.setQueryData(["notifications", "unread-count"], {
        count: lastMessage.count,
      });
    }
  }, [lastMessage, queryClient]);

  return {
    notifications: notificationsData?.notifications || [],
    total: notificationsData?.total || 0,
    unreadCount: unreadCountData?.count || 0,
    isLoading,
    error,
    isConnected,
    refetch,
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    dismiss: dismissMutation.mutateAsync,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getSeverityToastVariant(
  severity: NotificationSeverity
): "success" | "error" | "warning" | "info" {
  switch (severity) {
    case "SUCCESS":
      return "success";
    case "ERROR":
    case "CRITICAL":
      return "error";
    case "WARNING":
      return "warning";
    default:
      return "info";
  }
}
