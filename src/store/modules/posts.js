import { 
  ref as dbRef,
  push,
  set,
  get,
  update,
  remove,
  serverTimestamp
} from 'firebase/database';
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
      state.posts = { ...state.posts, ...posts };
    },
    SET_POST(state, post) {
      state.posts = { ...state.posts, [post.id]: post };
    },
    SET_CURRENT_POST(state, post) {
      state.currentPost = post;
    },
    UPDATE_POST(state, updatedPost) {
      state.posts[updatedPost.id] = { ...state.posts[updatedPost.id], ...updatedPost };
    },
    SET_LOADING(state, loading) {
      state.loading = loading;
    },
    SET_ERROR(state, error) {
      state.error = error;
    }
  },

  actions: {
    async createPost({ commit, rootState }, postData) {
      commit('SET_LOADING', true);
      try {
        const db = getDatabase();
        const postsRef = dbRef(db, 'posts');
        const newPostRef = push(postsRef);
        const postId = newPostRef.key;

        if (!postId) {
          throw new Error('Не удалось сгенерировать ID для поста');
        }

        const currentUser = rootState.auth.user;
        if (!currentUser) {
          throw new Error('Требуется авторизация для создания поста');
        }

        const fullPostData = {
          id: postId,
          title: postData.title,
          content: postData.content,
          categoryId: postData.categoryId,
          authorId: currentUser.uid,
          pictures: postData.pictures || [],
          videos: postData.videos || [],
          audio: postData.audio || [],
          documents: postData.documents || [],
          tags: postData.tags || [],
          likes: {},
          likesCount: 0,
          views: 0,
          createdAt: postData.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await set(newPostRef, fullPostData);
        const categoryPostRef = dbRef(db, `categories/${postData.categoryId}/posts/${postId}`);
        await set(categoryPostRef, fullPostData);

        commit('SET_POST', fullPostData);
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

    async fetchPostById({ commit }, postId) {
      commit('SET_LOADING', true);
      try {
        const db = getDatabase();
        const categoriesRef = dbRef(db, 'categories');
        const categoriesSnapshot = await get(categoriesRef);
        
        if (categoriesSnapshot.exists()) {
          const categories = categoriesSnapshot.val();
          for (const categoryId in categories) {
            if (categories[categoryId].posts && categories[categoryId].posts[postId]) {
              const postData = {
                id: postId,
                categoryId,
                ...categories[categoryId].posts[postId]
              };
              if (postData.authorId) {
                const authorRef = dbRef(db, `users/${postData.authorId}/profile`);
                const authorSnapshot = await get(authorRef);
                if (authorSnapshot.exists()) {
                  postData.author = { id: postData.authorId, ...authorSnapshot.val() };
                }
              }
              commit('SET_POST', postData);
              commit('SET_CURRENT_POST', postData);
              return postData;
            }
          }
        }
        throw new Error('Пост не найден');
      } catch (error) {
        console.error('Ошибка при загрузке поста:', error);
        commit('SET_ERROR', error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },

    async toggleLike({ commit, rootState }, postId) {
      const currentUser = rootState.auth.user;
      if (!currentUser) {
        throw new Error('Требуется авторизация');
      }

      try {
        const db = getDatabase();
        const categoriesRef = dbRef(db, 'categories');
        const categoriesSnapshot = await get(categoriesRef);
        
        if (categoriesSnapshot.exists()) {
          const categories = categoriesSnapshot.val();
          for (const categoryId in categories) {
            if (categories[categoryId].posts && categories[categoryId].posts[postId]) {
              const postRef = dbRef(db, `categories/${categoryId}/posts/${postId}`);
              const postSnapshot = await get(postRef);
              
              if (postSnapshot.exists()) {
                const post = postSnapshot.val();
                const likes = post.likes || {};
                let likesCount = Object.keys(likes).length;

                if (likes[currentUser.uid]) {
                  delete likes[currentUser.uid];
                  likesCount--;
                } else {
                  likes[currentUser.uid] = true;
                  likesCount++;
                }

                const updatedPost = {
                  ...post,
                  id: postId,
                  categoryId,
                  likes,
                  likesCount
                };

                await update(postRef, { likes, likesCount });
                commit('UPDATE_POST', updatedPost);
                return updatedPost;
              }
            }
          }
        }
        throw new Error('Пост не найден');
      } catch (error) {
        console.error('Ошибка при обновлении лайка:', error);
        throw error;
      }
    },

    async fetchPostsByCategory({ commit }, categoryId) {
      commit('SET_LOADING', true);
      try {
        const categoryPostsRef = dbRef(database, `categories/${categoryId}/posts`);
        const categoryPostsSnapshot = await get(categoryPostsRef);
        
        if (!categoryPostsSnapshot.exists()) {
          commit('SET_POSTS', {});
          return {};
        }
        
        const postsData = categoryPostsSnapshot.val();
        const posts = {};
        for (const postId in postsData) {
          posts[postId] = {
            id: postId,
            ...postsData[postId]
          };
        }
        
        commit('SET_POSTS', posts);
        return posts;
      } catch (error) {
        console.error('Ошибка при загрузке постов категории:', error);
        commit('SET_ERROR', error.message);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    }
  },

  getters: {
    getAllPosts: state => state.posts,
    getPostById: state => id => state.posts[id],
    getCurrentPost: state => state.currentPost,
    isLoading: state => state.loading,
    getError: state => state.error
  }
};