import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { registrationService } from "@/services/registrationService";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs";

export default function ManageUsers() {
    const queryClient = useQueryClient();
    const [selected, setSelected] = useState<any | null>(null);

    // ✅ Queries
    const { data: pending, isLoading: loadingPending } = useQuery({
        queryKey: ["pending-registrations"],
        queryFn: registrationService.getPending,
    });

    const { data: users, isLoading: loadingUsers } = useQuery({
        queryKey: ["approved-users"],
        queryFn: registrationService.getApproved,
    });

    // ✅ View details
    const handleView = async (client_uuid: string) => {
        try {
            const data = await registrationService.getByUUID(client_uuid);
            setSelected(data);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to load details");
        }
    };

    // ✅ Approve pending registration
    const approveMutation = useMutation({
        mutationFn: (client_uuid: string) => registrationService.approve(client_uuid),
        onSuccess: () => {
            toast.success("✅ User approved!");
            queryClient.invalidateQueries({ queryKey: ["pending-registrations"] });
            queryClient.invalidateQueries({ queryKey: ["approved-users"] });
            setSelected(null);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || "Approval failed");
        },
    });

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">Manage Users</h1>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                </TabsList>

                {/* ✅ Approved Users */}
                <TabsContent value="users">
                    {loadingUsers ? (
                        <div className="flex items-center justify-center py-10 text-muted-foreground">
                            <Loader2 className="animate-spin mr-2" /> Loading users...
                        </div>
                    ) : users?.length === 0 ? (
                        <p className="text-muted-foreground">No users found.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {users.map((user: any) => (
                                <Card key={user.id} className="shadow-sm">
                                    <CardHeader>
                                        <CardTitle>{user.reg_type}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <p><b>Client UUID:</b> {user.client_uuid}</p>
                                        <p><b>Tx Hash:</b> {user.tx_hash?.slice(0, 12)}...</p>
                                        <p><b>Created:</b> {new Date(user.created_at).toLocaleString()}</p>
                                        <Button size="sm" variant="outline" onClick={() => handleView(user.client_uuid)}>
                                            View
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* 🕓 Pending Users */}
                <TabsContent value="pending">
                    {loadingPending ? (
                        <div className="flex items-center justify-center py-10 text-muted-foreground">
                            <Loader2 className="animate-spin mr-2" /> Loading pending requests...
                        </div>
                    ) : pending?.length === 0 ? (
                        <p className="text-muted-foreground">✅ No pending registrations.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pending.map((item: any) => (
                                <Card key={item.id} className="shadow-sm">
                                    <CardHeader>
                                        <CardTitle>
                                            {item.reg_type}{" "}
                                            <span className="text-xs text-muted-foreground">(Pending)</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <p><b>Client UUID:</b> {item.client_uuid}</p>
                                        <p><b>Tx Hash:</b> {item.tx_hash?.slice(0, 12)}...</p>
                                        <p><b>Created:</b> {new Date(item.created_at).toLocaleString()}</p>

                                        <div className="flex gap-2 mt-3">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleView(item.client_uuid)}
                                            >
                                                View
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => approveMutation.mutate(item.client_uuid)}
                                                disabled={approveMutation.isPending}
                                            >
                                                {approveMutation.isPending ? (
                                                    <Loader2 className="animate-spin w-4 h-4 mr-1" />
                                                ) : (
                                                    "Approve"
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* 🔍 Details Modal */}
            {selected && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <Card className="w-full max-w-lg shadow-xl bg-background">
                        <CardHeader className="flex justify-between">
                            <CardTitle>
                                {selected.payload?.type || selected.reg_type || "User Details"}
                            </CardTitle>
                            <Button
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => setSelected(null)}
                            >
                                Close
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p><b>UUID:</b> {selected.payload?.identification?.uuid}</p>
                            <p><b>Legal Name:</b> {selected.payload?.identification?.legalName}</p>
                            <p><b>Public Key:</b> {selected.payload?.identification?.publicKey}</p>
                            <p><b>Business Reg No:</b> {selected.payload?.identification?.businessRegNo}</p>
                            <p><b>Country:</b> {selected.payload?.identification?.countryOfIncorporation}</p>
                            <p><b>Email:</b> {selected.payload?.contact?.email}</p>
                            <p><b>Phone:</b> {selected.payload?.contact?.phone}</p>
                            <p><b>Address:</b> {selected.payload?.contact?.address}</p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
