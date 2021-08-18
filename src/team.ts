import {
  getUserMetadata,
  searchUserInDay,
  getSpreadsheetsByType,
  zipTable,
} from '@utils/user-meta'
import { makeEnglish } from '@utils/text'
import { getDate } from '@utils/date'
import {
  prettifyDistance,
  prettifyIntervals,
  prettifyOnOff,
  prettifyTimed,
} from '@utils/prettify-data'
import { sheets, query, user_metadata, user_data_by_type } from 'types/types'

async function getMetadata(sheets) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheet_ids.meta,
    range: `data!A:F`,
  })
  if (response) {
    return response.data.values
  } else {
    console.log('no response from google sheets')
  }
}


export async function team(query, sheets) {
  // TODO: make a large object containing the whole team's data
  const output = {}
  const metadata = await getMetadata(sheets, spreadsheet_ids.meta, 'data!A:F')
  output.metadata = metadata
  return output
}
