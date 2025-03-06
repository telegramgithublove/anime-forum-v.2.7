import { ref as databaseRef, push, set, onValue } from 'firebase/database';
import { database } from '../../plugins/firebase';

export default {
  namespaced: true,
  state() {
    return {
      replies: {},
    };
  },
  mutations: {
    SET_REPLIES(state, { commentId, replies }) {
      state.replies[commentId] = replies;
    },
    ADD_REPLY(state, { commentId, reply }) {
      if (!state.replies[commentId]) {
        state.replies[commentId] = [];
      }
      state.replies[commentId].push(reply);
    },
  },
  actions: {
    async fetchReplies({ commit }, { postId, commentId }) {
      try {
        const repliesRef = databaseRef(database, `posts/${postId}/comments/${commentId}/replies`);
        onValue(repliesRef, (snapshot) => {
          const replies = [];
          if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
              replies.push({
                id: childSnapshot.key,
                ...childSnapshot.val(),
              });
            });
          }
          commit('SET_REPLIES', { commentId, replies });
        });
      } catch (error) {
        console.error('Ошибка при загрузке ответов:', error);
      }
    },
    async addReply({ commit, rootState }, { postId, commentId, content }) {
      try {
        const currentUser = rootState.auth.user;
        if (!currentUser) {
          throw new Error('Пользователь не авторизован');
        }

        const newReply = {
          content,
          author: {
            uid: currentUser.uid,
            username: currentUser.username || 'Гость',
            avatarUrl: currentUser.avatarUrl || '/image/empty_avatar.png',
          },
          createdAt: new Date().toISOString(),
        };

        const repliesRef = databaseRef(database, `posts/${postId}/comments/${commentId}/replies`);
        const newReplyRef = push(repliesRef);
        await set(newReplyRef, newReply);

        commit('ADD_REPLY', { commentId, reply: { id: newReplyRef.key, ...newReply } });
        return { success: true };
      } catch (error) {
        console.error('Ошибка при добавлении ответа:', error);
        return { success: false, error: error.message };
      }
    },
  },
  getters: {
    getReplies: (state) => (commentId) => {
      return state.replies[commentId] || [];
    },
  },
};