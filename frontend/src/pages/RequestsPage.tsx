import { useState } from 'react'
import { CatCard } from '@/components/CatCard'
import { mockCat } from '@/mocks/data/cats'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'

const RequestsPage = () => {
  // Mock data for now, will be replaced with API call
  const cats = [mockCat]

  const [typeFilter, setTypeFilter] = useState('all')
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()

  const filteredCats = cats.filter((cat) => {
    if (!cat.placement_requests) return false

    const hasMatchingRequest = cat.placement_requests.some((request) => {
      const typeMatch = typeFilter === 'all' || request.request_type === typeFilter

      const requestStartDate = new Date(request.start_date)
      const requestEndDate = new Date(request.end_date)

      const startDateMatch = !startDate || requestStartDate >= startDate
      const endDateMatch = !endDate || requestEndDate <= endDate

      return typeMatch && startDateMatch && endDateMatch
    })

    return hasMatchingRequest
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-4xl font-bold text-center">Placement Requests</h1>

      <div className="flex justify-center gap-4 mb-8">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="foster">Foster</SelectItem>
            <SelectItem value="adoption">Adoption</SelectItem>
          </SelectContent>
        </Select>
        <DatePicker date={startDate} setDate={setStartDate} placeholder="Start Date" />
        <DatePicker date={endDate} setDate={setEndDate} placeholder="End Date" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredCats.map((cat) => (
          <CatCard key={cat.id} cat={cat} />
        ))}
      </div>
    </div>
  )
}

export default RequestsPage