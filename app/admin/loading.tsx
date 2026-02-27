import { Loader2 } from 'lucide-react';

export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-10 w-10 animate-spin text-melsdorf-orange" />
    </div>
  );
}
