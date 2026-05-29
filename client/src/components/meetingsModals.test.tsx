import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { MeetingDto } from '../api/meetings'
import { MeetingCreateModal } from './MeetingCreateModal'
import { MeetingsDayModal } from './MeetingsDayModal'

const PAST_DATE = '2000-01-01'
const FUTURE_DATE = '2099-12-31'

function makeMeeting(overrides: Partial<MeetingDto> = {}): MeetingDto {
  return {
    _id: 'meeting-1',
    title: 'Team sync',
    date: FUTURE_DATE,
    time: '09:00',
    createdBy: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderMeetingCreateModal(
  props: Partial<ComponentProps<typeof MeetingCreateModal>> = {},
) {
  const onCreate = jest.fn()
  const onClose = jest.fn()
  const onTitleChange = jest.fn()
  const onDateChange = jest.fn()
  const onTimeChange = jest.fn()

  render(
    <MeetingCreateModal
      title="Weekly planning"
      date={PAST_DATE}
      time="10:00"
      onTitleChange={onTitleChange}
      onDateChange={onDateChange}
      onTimeChange={onTimeChange}
      onCreate={onCreate}
      onClose={onClose}
      isPending={false}
      {...props}
    />,
  )

  return { onCreate, onClose, onTitleChange, onDateChange, onTimeChange }
}

describe('MeetingCreateModal', () => {
  test('does not call onCreate when the selected date is in the past', async () => {
    const user = userEvent.setup()
    const { onCreate } = renderMeetingCreateModal()

    await user.click(screen.getByRole('button', { name: /^add$/i }))

    expect(onCreate).not.toHaveBeenCalled()
  })

  test('shows the past-date error inside the modal', async () => {
    const user = userEvent.setup()
    renderMeetingCreateModal()

    await user.click(screen.getByRole('button', { name: /^add$/i }))

    const error = screen.getByText('The selected date has already passed')
    expect(error).toBeInTheDocument()
    expect(error.closest('.tf-modal-dialog')).not.toBeNull()
  })
})

describe('MeetingsDayModal', () => {
  test('renders a list of meetings when data is provided', () => {
    const meetings = [
      makeMeeting({ _id: 'a', title: 'Design review', time: '09:00' }),
      makeMeeting({ _id: 'b', title: 'Sprint planning', time: '14:30' }),
    ]

    render(
      <MeetingsDayModal
        date={FUTURE_DATE}
        meetings={meetings}
        onSelectMeeting={jest.fn()}
        onClose={jest.fn()}
      />,
    )

    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByText('Design review')).toBeInTheDocument()
    expect(screen.getByText('Sprint planning')).toBeInTheDocument()
    expect(screen.getByText('09:00')).toBeInTheDocument()
    expect(screen.getByText('14:30')).toBeInTheDocument()
  })

  test('shows empty state when there are no meetings', () => {
    render(
      <MeetingsDayModal
        date={FUTURE_DATE}
        meetings={[]}
        onSelectMeeting={jest.fn()}
        onClose={jest.fn()}
      />,
    )

    expect(screen.getByText('No meetings for this day.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  test('calls onSelectMeeting when a meeting row is clicked', async () => {
    const user = userEvent.setup()
    const meeting = makeMeeting({ title: 'Client call', time: '11:00' })
    const onSelectMeeting = jest.fn()

    render(
      <MeetingsDayModal
        date={FUTURE_DATE}
        meetings={[meeting]}
        onSelectMeeting={onSelectMeeting}
        onClose={jest.fn()}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: 'Edit meeting: Client call' }),
    )

    expect(onSelectMeeting).toHaveBeenCalledTimes(1)
    expect(onSelectMeeting).toHaveBeenCalledWith(meeting)
  })
})
