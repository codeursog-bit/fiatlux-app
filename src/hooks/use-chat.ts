import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChatService } from '@/services/chat.service';

export const useMyMessages = () => {
  return useQuery({
    queryKey: ['rider', 'messages'],
    queryFn: () => ChatService.getMyMessages(),
    refetchInterval: 10000,
  });
};

export const useSendRiderMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => ChatService.sendAsRider(content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider', 'messages'] });
    },
  });
};

export const useConversations = () => {
  return useQuery({
    queryKey: ['admin', 'conversations'],
    queryFn: () => ChatService.getConversations(),
    refetchInterval: 30000,
  });
};

export const useConversation = (riderId: string | null) => {
  return useQuery({
    queryKey: ['admin', 'conversation', riderId],
    queryFn: () => ChatService.getConversation(riderId as string),
    enabled: !!riderId,
    refetchInterval: 10000,
  });
};

export const useSendAdminMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ riderId, content }: { riderId: string; content: string }) =>
      ChatService.sendAsAdmin(riderId, content),
    onSuccess: (_, { riderId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'conversation', riderId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'conversations'] });
    },
  });
};
