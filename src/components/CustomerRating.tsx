import { useState } from 'react';
import { Star, X, MapPin, Clock, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { hapticLight, hapticSuccess } from '../hooks/useHapticFeedback';

interface CustomerRatingProps {
  deliveryId: string;
  customerName?: string;
  address?: string;
  onClose: () => void;
  onSubmit?: () => void;
}

interface RatingTag {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: 'positive' | 'negative';
}

const RATING_TAGS: RatingTag[] = [
  { id: 'friendly', label: 'Aimable', icon: <ThumbsUp className="w-4 h-4" />, type: 'positive' },
  { id: 'quick_response', label: 'Réactif', icon: <Clock className="w-4 h-4" />, type: 'positive' },
  { id: 'easy_access', label: 'Accès facile', icon: <MapPin className="w-4 h-4" />, type: 'positive' },
  { id: 'clear_instructions', label: 'Instructions claires', icon: <ThumbsUp className="w-4 h-4" />, type: 'positive' },
  { id: 'hard_to_find', label: 'Difficile à trouver', icon: <MapPin className="w-4 h-4" />, type: 'negative' },
  { id: 'unresponsive', label: 'Peu réactif', icon: <Clock className="w-4 h-4" />, type: 'negative' },
  { id: 'rude', label: 'Impoli', icon: <ThumbsDown className="w-4 h-4" />, type: 'negative' },
  { id: 'wrong_info', label: 'Infos incorrectes', icon: <AlertCircle className="w-4 h-4" />, type: 'negative' },
];

export function CustomerRating({
  deliveryId,
  customerName,
  address,
  onClose,
  onSubmit,
}: CustomerRatingProps) {
  const { showSuccess, showError } = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleStarClick = (star: number) => {
    hapticLight();
    setRating(star);
  };

  const toggleTag = (tagId: string) => {
    hapticLight();
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((t) => t !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      showError('Veuillez donner une note');
      return;
    }

    setSubmitting(true);

    try {
      // Save rating to database
      const { error } = await supabase
        .from('logitrack_customer_ratings')
        .insert({
          delivery_id: deliveryId,
          rating,
          tags: selectedTags,
          comment: comment || null,
        });

      if (error) {
        // If table doesn't exist, try to update the delivery directly
        console.error('Rating table error:', error);

        // Update delivery with customer rating
        await supabase
          .from('logitrack_deliveries')
          .update({
            customer_rating_by_driver: rating,
            customer_feedback_by_driver: comment || null,
          })
          .eq('id', deliveryId);
      }

      hapticSuccess();
      showSuccess('Merci pour votre évaluation !');
      onSubmit?.();
      onClose();
    } catch (err) {
      console.error('Rating error:', err);
      showError('Erreur lors de l\'envoi de l\'évaluation');
    }

    setSubmitting(false);
  };

  const displayRating = hoverRating || rating;
  const relevantTags = rating >= 4
    ? RATING_TAGS.filter((t) => t.type === 'positive')
    : rating > 0 && rating < 4
    ? RATING_TAGS.filter((t) => t.type === 'negative')
    : RATING_TAGS;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 safe-bottom max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Évaluer le client</h2>
            {customerName && (
              <p className="text-sm text-gray-500">{customerName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Address Preview */}
        {address && (
          <div className="bg-gray-50 rounded-xl p-3 mb-6 flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600 line-clamp-2">{address}</p>
          </div>
        )}

        {/* Star Rating */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3 text-center">
            Comment s'est passée cette livraison ?
          </p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform active:scale-90"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= displayRating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">
            {rating === 0 && 'Touchez pour noter'}
            {rating === 1 && 'Très mauvais'}
            {rating === 2 && 'Mauvais'}
            {rating === 3 && 'Correct'}
            {rating === 4 && 'Bien'}
            {rating === 5 && 'Excellent'}
          </p>
        </div>

        {/* Rating Tags */}
        {rating > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Qu'est-ce qui a {rating >= 4 ? 'bien fonctionné' : 'posé problème'} ?
            </p>
            <div className="flex flex-wrap gap-2">
              {relevantTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedTags.includes(tag.id)
                      ? tag.type === 'positive'
                        ? 'bg-green-100 text-green-700 border-2 border-green-500'
                        : 'bg-red-100 text-red-700 border-2 border-red-500'
                      : 'bg-gray-100 text-gray-700 border-2 border-transparent'
                  }`}
                >
                  {tag.icon}
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comment */}
        {rating > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commentaire (optionnel)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ajoutez un commentaire sur cette livraison..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleSubmit}
            disabled={rating === 0}
            loading={submitting}
            fullWidth
            size="lg"
          >
            Envoyer l'évaluation
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            fullWidth
          >
            Passer
          </Button>
        </div>

        {/* Info */}
        <p className="text-xs text-gray-400 text-center mt-4">
          Cette évaluation est anonyme et aide à améliorer le service
        </p>
      </div>
    </div>
  );
}

export default CustomerRating;
