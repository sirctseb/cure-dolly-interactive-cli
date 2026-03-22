export function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="relative w-full pb-[56.25%] mb-6">
      <iframe
        className="absolute inset-0 w-full h-full rounded-lg"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
