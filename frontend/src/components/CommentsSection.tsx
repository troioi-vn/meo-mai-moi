import React, { useState, useEffect } from 'react';

interface Comment {
  id: number;
  user: { name: string };
  comment: string;
  created_at: string;
}

interface CommentsSectionProps {
  catId: number;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ catId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/cats/${catId}/comments`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setComments(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [catId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/api/cats/${catId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer YOUR_AUTH_TOKEN`, // TODO: Replace with actual auth token
        },
        body: JSON.stringify({ comment: newComment }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const addedComment = await response.json();
      setComments((prevComments) => [addedComment, ...prevComments]);
      setNewComment('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return <div>Loading comments...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Comments</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={4}
          cols={50}
        />
        <br />
        <button type="submit">Submit Comment</button>
      </form>
      <div>
        {comments.map((comment) => (
          <div key={comment.id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
            <p><strong>{comment.user.name}</strong> on {new Date(comment.created_at).toLocaleDateString()}</p>
            <p>{comment.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommentsSection;
