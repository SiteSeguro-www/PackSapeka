import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Image as ImageIcon, 
  Video, 
  Send, 
  Trash2, 
  ShoppingBag, 
  User as UserIcon,
  Clock,
  Plus,
  X,
  Upload,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FeedItem {
  id: string;
  type: 'post' | 'sale';
  content?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  authorName: string;
  authorId: string;
  serviceTitle?: string;
  price?: number;
  createdAt: any;
}

export default function Feed() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newPost, setNewPost] = useState({
    content: '',
    mediaUrl: '',
    mediaType: 'image' as 'image' | 'video'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'feed'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FeedItem[];
      setItems(feedItems);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching feed:', error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setNewPost({
        ...newPost,
        mediaType: file.type.startsWith('video') ? 'video' : 'image'
      });
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!newPost.content && !selectedFile && !newPost.mediaUrl)) return;

    setSubmitting(true);
    try {
      let finalMediaUrl = newPost.mediaUrl;
      let finalMediaType = newPost.mediaType;

      if (selectedFile) {
        const fileRef = ref(storage, `feed/${user.uid}/${Date.now()}_${selectedFile.name}`);
        const uploadResult = await uploadBytes(fileRef, selectedFile);
        finalMediaUrl = await getDownloadURL(uploadResult.ref);
        finalMediaType = selectedFile.type.startsWith('video') ? 'video' : 'image';
      }

      await addDoc(collection(db, 'feed'), {
        type: 'post',
        content: newPost.content,
        mediaUrl: finalMediaUrl || null,
        mediaType: finalMediaUrl ? finalMediaType : null,
        authorName: user.displayName || 'Usuário',
        authorId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewPost({ content: '', mediaUrl: '', mediaType: 'image' });
      setSelectedFile(null);
      setShowCreate(false);
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Erro ao criar postagem. Verifique sua conexão e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta postagem?')) return;
    try {
      await deleteDoc(doc(db, 'feed', id));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12 px-4 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-gray-400 to-white bg-clip-text text-transparent tracking-tighter">
              FEED GERAL
            </h1>
            <p className="text-white/40 mt-2 font-mono text-sm uppercase tracking-widest">
              Comunidade & Atividade em Tempo Real
            </p>
          </div>
          {user && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreate(true)}
              className="bg-white text-black p-4 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all"
            >
              <Plus size={24} />
            </motion.button>
          )}
        </div>

        {/* Create Post Modal */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#111] border border-white/10 p-8 rounded-3xl w-full max-w-lg relative"
              >
                <button 
                  onClick={() => setShowCreate(false)}
                  className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
                <h2 className="text-2xl font-bold mb-6">Nova Postagem</h2>
                <form onSubmit={handleCreatePost} className="space-y-6">
                  <div>
                    <label className="block text-xs font-mono text-white/40 uppercase mb-2">Mensagem</label>
                    <textarea
                      value={newPost.content}
                      onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                      placeholder="O que está acontecendo?"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-orange-500 transition-colors h-32 resize-none"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <label className="block text-xs font-mono text-white/40 uppercase mb-2">Mídia (Foto ou Vídeo)</label>
                    <div className="flex flex-col gap-4">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-32 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-orange-500/50 hover:bg-white/5 transition-all"
                      >
                        {selectedFile ? (
                          <div className="flex items-center gap-2 text-orange-500">
                            {selectedFile.type.startsWith('video') ? <Video size={24} /> : <ImageIcon size={24} />}
                            <span className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                          </div>
                        ) : (
                          <>
                            <Upload size={24} className="text-white/20" />
                            <span className="text-sm text-white/40">Clique para fazer upload</span>
                          </>
                        )}
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,video/*"
                        className="hidden"
                      />
                      
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <span className="text-white/20 text-xs font-mono">OU URL</span>
                        </div>
                        <input
                          type="text"
                          value={newPost.mediaUrl}
                          onChange={(e) => setNewPost({ ...newPost, mediaUrl: e.target.value })}
                          placeholder="https://..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-16 text-white outline-none focus:border-orange-500 transition-colors text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={submitting}
                    className="w-full bg-white text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all disabled:opacity-50"
                  >
                    {submitting ? (
                      <><Loader2 className="animate-spin" size={18} /> Postando...</>
                    ) : (
                      <><Send size={18} /> Publicar</>
                    )}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feed Items */}
        <div className="space-y-8">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`group relative bg-[#111] border border-white/10 rounded-3xl overflow-hidden transition-all hover:border-white/20 ${item.type === 'sale' ? 'border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.05)]' : ''}`}
              >
                {/* Sale Badge */}
                {item.type === 'sale' && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500"></div>
                )}

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'sale' ? 'bg-orange-500/20 text-orange-500' : 'bg-white/5 text-white/40'}`}>
                        {item.type === 'sale' ? <ShoppingBag size={20} /> : <UserIcon size={20} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-white flex items-center gap-2">
                          {item.authorName}
                          {item.type === 'sale' && (
                            <span className="text-[10px] bg-orange-500 text-black px-2 py-0.5 rounded-full font-mono uppercase font-black">
                              VENDA REALIZADA
                            </span>
                          )}
                        </h3>
                        <p className="text-[10px] text-white/30 flex items-center gap-1 font-mono uppercase">
                          <Clock size={10} />
                          {item.createdAt ? formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'Agora mesmo'}
                        </p>
                      </div>
                    </div>
                    {(isAdmin || (user && user.uid === item.authorId)) && (
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="text-white/20 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  {item.type === 'post' ? (
                    <div className="space-y-4">
                      {item.content && (
                        <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
                          {item.content}
                        </p>
                      )}
                      {item.mediaUrl && (
                        <div className="rounded-2xl overflow-hidden border border-white/5 bg-black/20">
                          {item.mediaType === 'video' ? (
                            <video 
                              src={item.mediaUrl} 
                              controls 
                              className="w-full aspect-video object-cover"
                            />
                          ) : (
                            <img 
                              src={item.mediaUrl} 
                              alt="Post media" 
                              className="w-full max-h-[500px] object-cover"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5 relative overflow-hidden group/sale">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover/sale:opacity-100 transition-opacity"></div>
                      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <p className="text-white/40 text-xs font-mono uppercase mb-1">Serviço Vendido</p>
                          <h4 className="text-xl font-bold text-white group-hover/sale:text-orange-400 transition-colors">
                            {item.serviceTitle}
                          </h4>
                        </div>
                        <div className="text-right">
                          <p className="text-white/40 text-xs font-mono uppercase mb-1">Valor</p>
                          <p className="text-2xl font-black text-orange-500">
                            R$ {item.price?.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Stats (Mock) */}
                <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex items-center gap-6">
                  <button className="flex items-center gap-2 text-white/20 hover:text-white transition-colors text-xs font-mono">
                    <MessageSquare size={14} /> 0 COMENTÁRIOS
                  </button>
                  {item.type === 'sale' && (
                    <div className="ml-auto text-[10px] text-white/20 font-mono uppercase">
                      ID: {item.id.substring(0, 8)}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {items.length === 0 && (
            <div className="text-center py-24 bg-[#111] border border-white/10 rounded-3xl">
              <MessageSquare size={48} className="mx-auto text-white/10 mb-4" />
              <p className="text-white/40 font-mono uppercase tracking-widest">O feed está vazio</p>
              <p className="text-white/20 text-xs mt-2">Seja o primeiro a postar algo!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

