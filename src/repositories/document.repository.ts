import sql from 'mssql'
import db from '../db'
import { FastifyBaseLogger } from 'fastify'

const DB_NAME = 'PCM'

export default class Document {
  schema: string = '[document].'
  _logger: FastifyBaseLogger

  constructor(logger: FastifyBaseLogger) { this._logger = logger }

  async findOne(filters) {
    const r = new sql.Request(await db.get(DB_NAME))

    r.input('id', sql.Int, filters.id)
    r.input('guid', sql.UniqueIdentifier, filters.guid)
    r.input('company', sql.Char, filters.company)
    r.input('company_oe', sql.Char, filters.companyOe)
    r.input('object_type', sql.VarChar, filters.objectType)
    r.input('document_type', sql.VarChar, filters.documentType)
    r.input('object_id', sql.BigInt, filters.objectId)
    r.input('culture', sql.VarChar, filters.culture)

    let result = await r.execute(`${this.schema}usp_findOne`)

    if (result.recordset && result.recordset.length === 1) {
      return result.recordset[0]
    } else if (result.recordset && result.recordset.length > 1) {
      console.error('Wrong number of records, return first result')
      return result.recordset[0]
    }
    return undefined
  }

  async getGuidByParams(company: string, objecttype: string, documenttype: string, itemnum: string, language: string, size: string, swp: boolean) {
    const r = new sql.Request(await db.get(DB_NAME))
    r.input('company', sql.VarChar, company)
    r.input('objecttype', sql.VarChar, objecttype)
    r.input('documenttype', sql.VarChar, documenttype)
    r.input('itemnum', sql.VarChar, itemnum)
    r.input('language', sql.VarChar, language)
    r.input('size', sql.VarChar, size)

    const result = await r.execute('GetDocumentGuidByParams')

    if (result.recordsets && result.recordsets[1].length > 0 && result.recordsets[1][0]) {
      return {
        error: result.recordset[0].error,
        verified: result.recordset[0].verified,
        result: result.recordsets[1][0][0] || []
      }
    }
    if (swp) {
      return undefined
    }
    return { result: { guid: '6258fae1-fbd0-45f1-8aef-68b76a30276e' } }
  }
}