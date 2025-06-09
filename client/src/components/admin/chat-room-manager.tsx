import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Minus, Search, MessageSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ChatRoomManager() {
  const [selectedRoom, setSelectedRoom] = useState("support");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const availableRooms = [
    { id: 'support', name: 'Technical Support', icon: '🛠️', type: 'private' },
    { id: 'general', name: 'General Discussion', icon: '💬', type: 'public' },
    { id: 'emergency', name: 'Emergency Channel', icon: '🚨', type: 'private' },
    { id: 'coordinators', name: 'Parish Coordinators', icon: '👥', type: 'private' },
  ];

  // Get observers for assignment
  const { data: observers } = useQuery({
    queryKey: ['/api/users/observers']
  });

  // Get room participants
  const { data: participants } = useQuery({
    queryKey: ['/api/chat/rooms', selectedRoom, 'participants'],
    enabled: !!selectedRoom
  });

  // Search users
  const { data: searchResults } = useQuery({
    queryKey: ['/api/chat/users/search', searchQuery],
    enabled: searchQuery.length > 2
  });

  // Assign users to room mutation
  const assignUsersMutation = useMutation({
    mutationFn: async ({ roomId, userIds }: { roomId: string; userIds: number[] }) => {
      return apiRequest(`/api/chat/rooms/assign`, {
        method: 'POST',
        body: { roomId, userIds }
      });
    },
    onSuccess: () => {
      toast({
        title: "Users Assigned",
        description: "Users have been successfully assigned to the room."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/rooms', selectedRoom, 'participants'] });
      setSelectedUserIds([]);
    },
    onError: () => {
      toast({
        title: "Assignment Failed",
        description: "Failed to assign users to room.",
        variant: "destructive"
      });
    }
  });

  // Remove users from room mutation
  const removeUsersMutation = useMutation({
    mutationFn: async ({ roomId, userIds }: { roomId: string; userIds: number[] }) => {
      return apiRequest(`/api/chat/rooms/remove`, {
        method: 'POST',
        body: { roomId, userIds }
      });
    },
    onSuccess: () => {
      toast({
        title: "Users Removed",
        description: "Users have been removed from the room."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/rooms', selectedRoom, 'participants'] });
      setSelectedUserIds([]);
    },
    onError: () => {
      toast({
        title: "Removal Failed",
        description: "Failed to remove users from room.",
        variant: "destructive"
      });
    }
  });

  const handleAssignUsers = () => {
    if (selectedUserIds.length > 0) {
      assignUsersMutation.mutate({ roomId: selectedRoom, userIds: selectedUserIds });
    }
  };

  const handleRemoveUsers = () => {
    if (selectedUserIds.length > 0) {
      removeUsersMutation.mutate({ roomId: selectedRoom, userIds: selectedUserIds });
    }
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const currentRoom = availableRooms.find(room => room.id === selectedRoom);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Chat Room Management</h2>
      </div>

      {/* Room Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Room</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableRooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  <div className="flex items-center space-x-2">
                    <span>{room.icon}</span>
                    <span>{room.name}</span>
                    <Badge variant={room.type === 'private' ? 'secondary' : 'outline'} className="text-xs">
                      {room.type}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Current Room Participants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Current Participants - {currentRoom?.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {participants && participants.length > 0 ? (
              participants.map((participant: any) => (
                <div
                  key={participant.userId}
                  className={`p-3 border rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                    selectedUserIds.includes(participant.userId) ? 'bg-primary/10 border-primary' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleUserSelection(participant.userId)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${participant.online ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                    <div>
                      <p className="font-medium">{participant.firstName} {participant.lastName}</p>
                      <p className="text-sm text-gray-500">@{participant.username} • {participant.role}</p>
                    </div>
                  </div>
                  <Badge variant={participant.role === 'admin' ? 'destructive' : 'secondary'}>
                    {participant.role}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No participants in this room</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Search and Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Users to Room</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users to add..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* All Observers */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Available Users</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(searchQuery.length > 2 ? searchResults : observers)?.map((user: any) => (
                <div
                  key={user.id}
                  className={`p-3 border rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                    selectedUserIds.includes(user.id) ? 'bg-primary/10 border-primary' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleUserSelection(user.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${user.online ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                    <div>
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-gray-500">@{user.username} • {user.role}</p>
                    </div>
                  </div>
                  <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                    {user.role}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          {selectedUserIds.length > 0 && (
            <div className="flex items-center space-x-2 pt-4 border-t">
              <Badge variant="outline">{selectedUserIds.length} selected</Badge>
              <Button
                onClick={handleAssignUsers}
                disabled={assignUsersMutation.isPending}
                className="flex items-center space-x-1"
              >
                <Plus className="h-4 w-4" />
                <span>Add to Room</span>
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveUsers}
                disabled={removeUsersMutation.isPending}
                className="flex items-center space-x-1"
              >
                <Minus className="h-4 w-4" />
                <span>Remove</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}