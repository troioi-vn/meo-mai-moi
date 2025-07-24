import React from 'react'
import type { Cat } from '@/types/cat'
import { calculateAge } from '@/types/cat'
import { getStatusDisplay, getStatusClasses } from '@/utils/catStatus'
import placeholderImage from '@/assets/images/placeholder--cat.webp'

interface CatDetailsProps {
  cat: Cat
}

export const CatDetails: React.FC<CatDetailsProps> = ({ cat }) => {
  const age = calculateAge(cat.birthday)
  const statusDisplay = getStatusDisplay(cat.status)
  const statusClasses = getStatusClasses(cat.status)

  return (
    <div className="bg-card rounded-lg shadow-lg overflow-hidden">
      <div className="md:flex">
        {/* Cat Image */}
        <div className="md:w-1/2">
          <img
            src={cat.photo_url ?? placeholderImage}
            alt={cat.name}
            className="w-full h-64 md:h-full object-cover"
          />
        </div>

        {/* Cat Information */}
        <div className="md:w-1/2 p-8">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-card-foreground mb-2">{cat.name}</h1>
              <p className="text-lg text-muted-foreground">
                {cat.breed} - {age} years old
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-card-foreground">Location</h3>
                <p className="text-muted-foreground">{cat.location}</p>
              </div>

              <div>
                <h3 className="font-semibold text-card-foreground">Status</h3>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusClasses}`}
                >
                  {statusDisplay}
                </span>
              </div>

              <div>
                <h3 className="font-semibold text-card-foreground">About {cat.name}</h3>
                <p className="text-muted-foreground leading-relaxed">{cat.description}</p>
              </div>

              {cat.placement_requests && cat.placement_requests.length > 0 && (
                <div>
                  <h3 className="font-semibold text-card-foreground">Active Placement Requests</h3>
                  <div className="mt-2 space-y-4">
                    {cat.placement_requests.map((request) => (
                      <div key={request.id} className="p-4 bg-muted rounded-lg">
                        <p className="font-semibold text-sm text-muted-foreground">
                          {request.request_type.replace('_', ' ').toUpperCase()} - <span className="font-normal">Expires: {new Date(request.expires_at).toLocaleDateString()}</span>
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">{request.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
