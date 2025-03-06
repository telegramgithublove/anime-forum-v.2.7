import { 
  ref as dbRef,
  push,
  set,
  get,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
  child
} from 'firebase/database';
import { serverTimestamp } from 'firebase/database';
import { database } from '../../plugins/firebase';
import { getDatabase } from 'firebase/database';

export default {
  namespaced: true,
  
  state: {
    posts: {},
    comments: {},
    currentPost: null,
    editingPost: null,
    loading: false,
    error: null
  },

  mutations: {
    SET_POSTS(state, posts) {
      state.posts = { ...state.posts, ...posts }
    },
    SET_POST(state, post) {
      state.posts = { ...state.posts, [post.id]: post }
    },
    SET_COMMENTS(state, { postId, comments }) {
      state.comments = { 
        ...state.comments, 
        [postId]: comments 
      }
    },
    ADD_COMMENT(state, { postId, comment }) {
      const comments = state.comments[postId] || []
      state.comments = {
        ...state.comments,
        [postId]: [...comments, comment]
      }
    },
    UPDATE_COMMENT(state, { postId, commentId, updates }) {
      const comments = state.comments[postId] || []
      state.comments = {
        ...state.comments,
        [postId]: comments.map(comment => 
          comment.id === commentId ? { ...comment, ...updates } : comment
        )
      }
    },
    DELETE_COMMENT(state, { postId, commentId }) {
      const comments = state.comments[postId] || []
      state.comments = {
        ...state.comments,
        [postId]: comments.filter(comment => comment.id !== commentId)
      }
    },
    ADD_REPLY(state, { postId, commentId, reply }) {
      const comments = state.comments[postId] || []
      state.comments = {
        ...state.comments,
        [postId]: comments.map(comment => {
          if (comment.id === commentId) {
            const replies = comment.replies || []
            return { ...comment, replies: [...replies, reply] }
          }
          return comment
        })
      }
    },
    SET_CURRENT_POST(state, post) {
      state.currentPost = post;
    },
    SET_EDITING_POST(state, post) {
      state.editingPost = post;
    },
    UPDATE_POST(state, updatedPost) {
      const index = Object.keys(state.posts).find(key => state.posts[key].id === updatedPost.id);
      if (index !== undefined) {
        state.posts[index] = updatedPost;
      }
    },
    DELETE_POST(state, postId) {
      delete state.posts[postId];
    },
    SET_LOADING(state, loading) {
      state.loading = loading
    },
    SET_ERROR(state, error) {
      state.error = error
    },
    ADD_COMMENT(state, { postId, comment }) {
      const post = state.posts.find(p => p.id === postId);
      if (post) {
        if (!post.comments) {
          post.comments = [];
        }
        post.comments.push(comment);
      }
    },
    UPDATE_COMMENT_LIKES(state, { postId, commentId, increment }) {
      const post = state.posts.find(p => p.id === postId);
      if (post && post.comments) {
        const comment = post.comments.find(c => c.id === commentId);
        if (comment) {
          comment.likes = (comment.likes || 0) + increment;
          comment.isLiked = increment > 0;
        }
      }
    },
    ADD_REPLY_TO_COMMENT(state, { postId, commentId, reply }) {
      const post = state.posts.find(p => p.id === postId);
      if (post && post.comments) {
        const comment = post.comments.find(c => c.id === commentId);
        if (comment) {
          if (!comment.replies) {
            comment.replies = [];
          }
          comment.replies.push(reply);
        }
      }
    }
  },

  actions: {
    // Получение поста по ID
    async fetchPostById({ commit }, postId) {
      commit('SET_LOADING', true);
      try {
        const db = getDatabase();
        
        // Сначала попробуем найти категорию, содержащую этот пост
        const categoriesRef = dbRef(db, 'categories');
        const categoriesSnapshot = await get(categoriesRef);
        
        if (categoriesSnapshot.exists()) {
          const categories = categoriesSnapshot.val();
          
          // Ищем пост во всех категориях
          for (const categoryId in categories) {
            if (categories[categoryId].posts && categories[categoryId].posts[postId]) {
              const postData = {
                id: postId,
                categoryId,
                ...categories[categoryId].posts[postId]
              };
              
              // Если есть ID автора, загружаем его профиль
              if (postData.authorId) {
                const authorRef = dbRef(db, `users/${postData.authorId}/profile`);
                const authorSnapshot = await get(authorRef);
                if (authorSnapshot.exists()) {
                  postData.author = {
                    id: postData.authorId,
                    ...authorSnapshot.val()
                  };
                }
              }
              
              commit('SET_POST', postData);
              commit('SET_CURRENT_POST', postData);
              return postData;
            }
          }
        }
        
        console.error('Пост не найден в категориях');
        throw new Error('Пост не найден');
      } catch (error) {
        console.error('Ошибка при загрузке поста:', error);
        commit('SET_ERROR', error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },

    // Создание нового поста
    async createPost({ commit }, postData) {
      commit('SET_LOADING', true);
      try {
        const postsRef = dbRef(database, 'posts');
        const newPostRef = push(postsRef);
        const postId = newPostRef.key;
        
        if (!postId) {
          throw new Error('Не удалось создать ID для поста');
        }
        
        // Обрабатываем пути к файлам в attachments
        if (postData.attachments) {
          postData.attachments = postData.attachments.map(attachment => ({
            ...attachment,
            url: attachment.url.replace('/uploads/', '/upload/')
          }));
        }
        
        const fullPostData = {
          ...postData,
          id: postId,
          likes: [],
          views: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await set(newPostRef, fullPostData);
        
        const categoryPostRef = dbRef(database, `categories/${postData.categoryId}/posts/${postId}`);
        await set(categoryPostRef, true);
        
        commit('SET_CURRENT_POST', fullPostData);
        return postId;
      } catch (error) {
        console.error('Ошибка при создании поста:', error);
        commit('SET_ERROR', error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },

    // Обновление поста
    async updatePost({ commit }, { postId, updateData }) {
      commit('SET_LOADING', true);
      try {
        // Обрабатываем пути к файлам в attachments при обновлении
        if (updateData.attachments) {
          updateData.attachments = updateData.attachments.map(attachment => ({
            ...attachment,
            url: attachment.url.replace('/uploads/', '/upload/')
          }));
        }

        const postRef = dbRef(database, `posts/${postId}`);
        const updates = {
          ...updateData,
          updatedAt: serverTimestamp()
        };
        
        await update(postRef, updates);
        
        // Обновляем состояние
        commit('UPDATE_POST', { id: postId, ...updates });
        return true;
      } catch (error) {
        console.error('Ошибка при обновлении поста:', error);
        commit('SET_ERROR', error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },

    // Удаление поста
    async deletePost({ commit }, postId) {
      commit('SET_LOADING', true);
      try {
        const postRef = dbRef(database, `posts/${postId}`);
        const postSnapshot = await get(postRef);
        
        if (!postSnapshot.exists()) {
          throw new Error('Пост не найден');
        }
        
        const post = postSnapshot.val();
        
        // Удаляем связь с категорией
        const categoryPostRef = dbRef(database, `categories/${post.categoryId}/posts/${postId}`);
        await remove(categoryPostRef);
        
        // Удаляем сам пост
        await remove(postRef);
        
        commit('DELETE_POST', postId);
      } catch (error) {
        console.error('Ошибка при удалении поста:', error);
        commit('SET_ERROR', error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },

    // Переключение лайка поста
    async toggleLike({ commit, rootState }, postId) {
      const currentUser = rootState.auth.user;
      if (!currentUser) {
        throw new Error('Необходимо войти в систему');
      }

      try {
        const postRef = dbRef(database, `posts/${postId}`);
        const snapshot = await get(postRef);
        
        if (!snapshot.exists()) {
          throw new Error('Пост не найден');
        }
        
        const post = {
          id: postId,
          ...snapshot.val()
        };
        
        const likes = post.likes || [];
        const userIndex = likes.indexOf(currentUser.uid);
        
        if (userIndex === -1) {
          likes.push(currentUser.uid);
        } else {
          likes.splice(userIndex, 1);
        }
        
        await update(postRef, { likes });
        
        const updatedPost = {
          ...post,
          likes
        };
        
        commit('UPDATE_POST', updatedPost);
        return updatedPost;
      } catch (error) {
        console.error('Ошибка при обновлении лайка:', error);
        commit('SET_ERROR', error.message);
        throw error;
      }
    },

    // Получение постов для категории
    async fetchPostsByCategory({ commit }, categoryId) {
      commit('SET_LOADING', true);
      try {
        const categoryPostsRef = dbRef(database, `categories/${categoryId}/posts`);
        const categoryPostsSnapshot = await get(categoryPostsRef);
        
        if (!categoryPostsSnapshot.exists()) {
          commit('SET_POSTS', {});
          return {};
        }
        
        const postIds = Object.keys(categoryPostsSnapshot.val());
        const posts = {};
        
        for (const postId of postIds) {
          const postRef = dbRef(database, `posts/${postId}`);
          const postSnapshot = await get(postRef);
          
          if (postSnapshot.exists()) {
            posts[postId] = {
              id: postId,
              ...postSnapshot.val()
            };
          }
        }
        
        const sortedPosts = Object.keys(posts).sort((a, b) => posts[b].createdAt - posts[a].createdAt);
        const sortedPostsObj = {};
        for (const postId of sortedPosts) {
          sortedPostsObj[postId] = posts[postId];
        }
        
        commit('SET_POSTS', sortedPostsObj);
        return sortedPostsObj;
      } catch (error) {
        console.error('Ошибка при загрузке постов категории:', error);
        commit('SET_ERROR', error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },

    async fetchComments({ commit }, postId) {
      try {
        commit('SET_LOADING', true)
        const database = getDatabase()
        const commentsRef = dbRef(database, `comments/${postId}`)
        const snapshot = await get(commentsRef)

        if (snapshot.exists()) {
          const commentsData = snapshot.val()
          const comments = Object.entries(commentsData).map(([id, data]) => ({
            id,
            ...data
          }))
          commit('SET_COMMENTS', { postId, comments })
        } else {
          commit('SET_COMMENTS', { postId, comments: [] })
        }
      } catch (error) {
        console.error('Ошибка при загрузке комментариев:', error)
        commit('SET_ERROR', error.message)
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async createComment({ commit, rootState }, { postId, text }) {
      try {
        const user = rootState.auth.user
        if (!user) throw new Error('Необходима авторизация')

        const database = getDatabase()
        const commentsRef = dbRef(database, `comments/${postId}`)
        const newCommentRef = push(commentsRef)

        const comment = {
          userId: user.uid,
          text,
          createdAt: Date.now(),
          likes: 0,
          user: {
            uid: user.uid,
            username: user.displayName,
            avatar: user.photoURL
          }
        }

        await set(newCommentRef, comment)
        
        commit('ADD_COMMENT', { 
          postId, 
          comment: { 
            id: newCommentRef.key, 
            ...comment 
          } 
        })

        // Обновляем количество комментариев в посте
        const postRef = dbRef(database, `posts/${postId}`)
        const postSnapshot = await get(postRef)
        if (postSnapshot.exists()) {
          const post = postSnapshot.val()
          await update(postRef, {
            commentsCount: (post.commentsCount || 0) + 1
          })
        }

        return comment
      } catch (error) {
        console.error('Ошибка при создании комментария:', error)
        commit('SET_ERROR', error.message)
        throw error
      }
    },

    async toggleCommentLike({ commit, rootState }, { postId, commentId }) {
      try {
        const user = rootState.auth.user
        if (!user) throw new Error('Необходима авторизация')

        const database = getDatabase()
        const likeRef = dbRef(database, `comments/${postId}/${commentId}/likes/${user.uid}`)
        const likesCountRef = dbRef(database, `comments/${postId}/${commentId}/likesCount`)

        const likeSnapshot = await get(likeRef)
        const isLiked = likeSnapshot.exists()

        if (isLiked) {
          await remove(likeRef)
          const snapshot = await get(likesCountRef)
          const currentLikes = snapshot.val() || 0
          await set(likesCountRef, Math.max(0, currentLikes - 1))
          
          commit('UPDATE_COMMENT', { 
            postId, 
            commentId, 
            updates: { 
              isLiked: false,
              likesCount: Math.max(0, currentLikes - 1)
            } 
          })
        } else {
          await set(likeRef, true)
          const snapshot = await get(likesCountRef)
          const currentLikes = snapshot.val() || 0
          await set(likesCountRef, currentLikes + 1)
          
          commit('UPDATE_COMMENT', { 
            postId, 
            commentId, 
            updates: { 
              isLiked: true,
              likesCount: currentLikes + 1
            } 
          })
        }
      } catch (error) {
        console.error('Ошибка при обновлении лайка:', error)
        commit('SET_ERROR', error.message)
        throw error
      }
    },

    async deleteComment({ commit, rootState }, { postId, commentId }) {
      try {
        const user = rootState.auth.user
        if (!user) throw new Error('Необходима авторизация')

        const database = getDatabase()
        const commentRef = dbRef(database, `comments/${postId}/${commentId}`)
        
        // Проверяем права на удаление
        const snapshot = await get(commentRef)
        if (!snapshot.exists()) {
          throw new Error('Комментарий не найден')
        }
        
        const comment = snapshot.val()
        if (comment.userId !== user.uid && !user.isAdmin) {
          throw new Error('Нет прав на удаление комментария')
        }

        await remove(commentRef)
        commit('DELETE_COMMENT', { postId, commentId })

        // Обновляем количество комментариев в посте
        const postRef = dbRef(database, `posts/${postId}`)
        const postSnapshot = await get(postRef)
        if (postSnapshot.exists()) {
          const post = postSnapshot.val()
          await update(postRef, {
            commentsCount: Math.max(0, (post.commentsCount || 0) - 1)
          })
        }
      } catch (error) {
        console.error('Ошибка при удалении комментария:', error)
        commit('SET_ERROR', error.message)
        throw error
      }
    },

    async createReply({ commit, rootState }, { postId, commentId, text }) {
      try {
        const user = rootState.auth.user
        if (!user) throw new Error('Необходима авторизация')

        const database = getDatabase()
        const repliesRef = dbRef(database, `comments/${postId}/${commentId}/replies`)
        const newReplyRef = push(repliesRef)

        const reply = {
          userId: user.uid,
          text,
          createdAt: Date.now(),
          user: {
            uid: user.uid,
            username: user.displayName,
            avatar: user.photoURL
          }
        }

        await set(newReplyRef, reply)
        
        commit('ADD_REPLY', { 
          postId, 
          commentId,
          reply: { 
            id: newReplyRef.key, 
            ...reply 
          } 
        })

        return reply
      } catch (error) {
        console.error('Ошибка при создании ответа:', error)
        commit('SET_ERROR', error.message)
        throw error
      }
    },

    async createComment({ commit, rootState }, commentData) {
      try {
        const { currentUser } = rootState.auth;
        const newComment = {
          id: Date.now().toString(),
          content: commentData.content,
          createdAt: new Date().toISOString(),
          author: {
            id: currentUser.uid,
            username: currentUser.displayName,
            avatarUrl: currentUser.photoURL,
            signature: currentUser.signature || 'Участник форума',
            online: true
          },
          likes: 0,
          isLiked: false,
          attachments: commentData.attachments || [],
          replies: []
        };

        // Сохраняем комментарий в Firebase
        await firebase.database().ref(`posts/${commentData.postId}/comments/${newComment.id}`).set(newComment);
        
        commit('ADD_COMMENT', { postId: commentData.postId, comment: newComment });
        return newComment;
      } catch (error) {
        console.error('Error creating comment:', error);
        throw error;
      }
    },

    async likeComment({ commit, rootState }, { postId, commentId }) {
      try {
        const { currentUser } = rootState.auth;
        const likeRef = firebase.database().ref(`posts/${postId}/comments/${commentId}/likes/${currentUser.uid}`);
        
        const snapshot = await likeRef.once('value');
        if (snapshot.exists()) {
          // Убираем лайк
          await likeRef.remove();
          commit('UPDATE_COMMENT_LIKES', { postId, commentId, increment: -1 });
        } else {
          // Добавляем лайк
          await likeRef.set(true);
          commit('UPDATE_COMMENT_LIKES', { postId, commentId, increment: 1 });
        }
      } catch (error) {
        console.error('Error liking comment:', error);
        throw error;
      }
    },

    async replyToComment({ commit, rootState }, { postId, commentId, content }) {
      try {
        const { currentUser } = rootState.auth;
        const reply = {
          id: Date.now().toString(),
          content,
          createdAt: new Date().toISOString(),
          author: {
            id: currentUser.uid,
            username: currentUser.displayName,
            avatarUrl: currentUser.photoURL
          }
        };

        await firebase.database().ref(`posts/${postId}/comments/${commentId}/replies/${reply.id}`).set(reply);
        commit('ADD_REPLY_TO_COMMENT', { postId, commentId, reply });
        return reply;
      } catch (error) {
        console.error('Error replying to comment:', error);
        throw error;
      }
    }
  },

  getters: {
    getAllPosts: state => state.posts,
    
    getCurrentPost: state => state.currentPost,
    
    getEditingPost: state => state.editingPost,
    
    getPostById: state => id => state.posts[id],
    
    getPostsByCategory: state => categoryId => 
      Object.values(state.posts).filter(post => post.categoryId === categoryId),
    
    getCommentsByPostId: state => postId => {
      const comments = state.comments[postId] || []
      return comments.sort((a, b) => b.createdAt - a.createdAt)
    },
    
    isLoading: state => state.loading,
    
    getError: state => state.error
  }
};
