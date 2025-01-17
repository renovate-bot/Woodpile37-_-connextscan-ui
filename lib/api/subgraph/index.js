import _ from 'lodash'
import moment from 'moment'

import { tx_manager } from '../../object/tx'
import { getRequestUrl, sleep } from '../../utils'

const _module = 'subgraph'

const request = async (path, params) => {
  const res = await fetch(getRequestUrl(process.env.NEXT_PUBLIC_API_URL, path, { ...params, module: _module })).catch(error => { return { error } })
  return res && (res.error ? res : await res.json())
}

export const graphql = async params => await request(null, params)

const analytic_subgraphs = {
  1: 'https://api.thegraph.com/subgraphs/name/connext/nxtp-mainnet-v1-analytics',
  56: 'https://api.thegraph.com/subgraphs/name/connext/nxtp-bsc-v1-analytics',
  137: 'https://api.thegraph.com/subgraphs/name/connext/nxtp-matic-v1-analytics',
  42161: 'https://api.thegraph.com/subgraphs/name/connext/nxtp-arbitrum-one-v1-analytics',
  42170: 'https://connext.bwarelabs.com/subgraphs/name/connext/nxtp-arbitrum-nova-v1-runtime',
  10: 'https://api.thegraph.com/subgraphs/name/connext/nxtp-optimism-v1-analytics',
  43114: 'https://api.thegraph.com/subgraphs/name/connext/nxtp-avalanche-v1-analytics',
  250: 'https://api.thegraph.com/subgraphs/name/connext/nxtp-fantom-v1-analytics',
  100: 'https://api.thegraph.com/subgraphs/name/connext/nxtp-xdai-v1-analytics',
  1284: 'https://connext.bwarelabs.com/subgraphs/name/connext/nxtp-moonbeam-v1-analytics',
  1285: 'https://api.thegraph.com/subgraphs/name/connext/nxtp-moonriver-v1-analytics',
  122: 'https://api.thegraph.com/subgraphs/name/connext/nxtp-fuse-v1-analytics',
  2001: 'https://connext.bwarelabs.com/subgraphs/name/connext/nxtp-milkomeda-cardano-v1-analytics',
  288: 'https://connext.bwarelabs.com/subgraphs/name/connext/nxtp-boba-v1-analytics',
  1666600000: 'https://connext.bwarelabs.com/subgraphs/name/connext/nxtp-harmonyone-v1-analytics',
  192837465: 'https://connext.bwarelabs.com/subgraphs/name/connext/nxtp-gather-v1-analytics',
  25: 'https://connext.bwarelabs.com/subgraphs/name/connext/nxtp-cronos-v1-analytics',
  9001: 'https://connext.bwarelabs.com/subgraphs/name/connext/nxtp-evmos-v1-analytics',
}

export const daily = async params => {
  const size = typeof params?.size === 'number' ? params.size : 1000
  if (typeof params?.size !== 'undefined') {
    delete params.size
  }

  const where = params?.where
  if (typeof params?.where !== 'undefined') {
    delete params.where
  }

  let skip = 0, data, hasMore = true

  while (hasMore) {
    const query = `
      {
        dayMetrics(orderBy: dayStartTimestamp, orderDirection: desc, skip: ${skip}, first: ${size}${where ? `, where: ${where}` : ''}) {
          id
          dayStartTimestamp
          assetId
          sendingTxCount
          receivingTxCount
          cancelTxCount
          volume
          volumeIn
          relayerFee
        }
      }
    `

    let response, error, time_spent_seconds, start_time = moment()

    if (analytic_subgraphs[params.chain_id]) {
      const res =
        await fetch(
          analytic_subgraphs[params.chain_id],
          {
            method: 'POST',
            body: JSON.stringify({ ...params, query }),
          }
        )
        .catch(error => { return { error } })

      response = res && (res.error ? res : await res.json())
    }
    else {
      response = await graphql({ ...params, api_type: 'analytic', query })
    }

    if (response?.error) {
      error = response.error
    }

    time_spent_seconds = moment().diff(start_time, 'seconds', true)

    console.log(
      '[dayMetrics]',
      params,
      { url: analytic_subgraphs[params.chain_id] },
      { data: response?.data },
      error || { error },
      { time_spent_seconds },
    )

    data = _.uniqBy(_.concat(data || [], response?.data?.dayMetrics?.map(d => {
      return {
        ...d,
        dayStartTimestamp: Number(d.dayStartTimestamp),
        sendingTxCount: Number(d.sendingTxCount) || 0,
        receivingTxCount: Number(d.receivingTxCount) || 0,
        cancelTxCount: Number(d.cancelTxCount) || 0,
        volume: Number(d.volume) || 0,
        volumeIn: Number(d.volumeIn) || 0,
        relayerFee: Number(d.relayerFee) || 0,
      }
    })), 'id').filter(d => d)

    hasMore = where && response?.data?.dayMetrics?.length === size

    if (hasMore) {
      skip += size
    }
  }

  return { data }
}

export const assetBalances = async params => {
  const size = typeof params?.size === 'number' ? params.size : 1000
  if (typeof params?.size !== 'undefined') {
    delete params.size
  }

  const where = params?.where
  if (typeof params?.where !== 'undefined') {
    delete params.where
  }

  let skip = 0, data, hasMore = true

  while (hasMore) {
    const query = `
      {
        assetBalances(orderBy: amount, orderDirection: desc) {
          id
          amount
          router {
            id
          }
          assetId
          locked
          lockedIn
          supplied
          removed
          volume
          volumeIn
          receivingFulfillTxCount
        }
      }
    `

    let response

    if (analytic_subgraphs[params.chain_id]) {
      const res =
        await fetch(
          analytic_subgraphs[params.chain_id],
          {
            method: 'POST',
            body: JSON.stringify({ ...params, query }),
          }
        )
        .catch(error => { return { error } })

      response = res && (res.error ? res : await res.json())
    }
    else {
      response = await graphql({ ...params, api_type: 'analytic', query })
    }

    data = _.uniqBy(_.concat(data || [], response?.data?.assetBalances?.map(assetBalance => {
      return {
        ...assetBalance,
        contract_address: assetBalance?.assetId,
      }
    })), 'id').filter(d => d)

    hasMore = where && response?.data?.assetBalances?.length === size

    if (hasMore) {
      skip += size
    }
  }

  return { data }
}

export const routers = async (sdk, chain_id, params, tokens) => {
  let data

  if (sdk && chain_id) {
    const size = typeof params?.size === 'number' ? params.size : 1000
    if (typeof params?.size !== 'undefined') {
      delete params.size
    }

    const where = params?.where
    if (typeof params?.where !== 'undefined') {
      delete params.where
    }

    let skip = 0, hasMore = true

    while (hasMore) {
      const query = `
        {
          routers {
            id
            assetBalances(orderBy: amount, orderDirection: desc) {
              id
              amount
              assetId
            }
          }
        }
      `

      let response
      try {
        response = await sdk.querySubgraph(chain_id, query)
      } catch (error) {}

      data = _.uniqBy(_.concat(data || [], response?.routers?.map(r => {
        return {
          ...r,
          assetBalances: r?.assetBalances?.map(ab => {
            return {
              ...ab,
              asset: tokens?.find(t => t?.chain_id === chain_id && t.contract_address === ab?.assetId),
            }
          }),
        }
      })), 'id')

      hasMore = where && response?.routers?.length === size

      if (hasMore) {
        skip += size
      }
    }
  }

  return { data }
}

export const user = async (sdk, chain_id, address, chains, tokens) => {
  let response

  if (sdk && chain_id && address) {
    const query = `
      {
        user(id: "${address.toLowerCase()}") {
          id,
          transactions(orderBy: preparedTimestamp, orderDirection: desc) {
            id
            status
            chainId
            preparedTimestamp
            receivingChainTxManagerAddress
            user {
              id
            }
            router {
              id
            }
            initiator
            sendingAssetId
            receivingAssetId
            sendingChainFallback
            callTo
            receivingAddress
            callDataHash
            transactionId
            sendingChainId
            receivingChainId
            amount
            expiry
            preparedBlockNumber
            encryptedCallData
            prepareCaller
            bidSignature
            encodedBid
            prepareTransactionHash
            prepareMeta
            relayerFee
            signature
            callData
            externalCallSuccess
            externalCallIsContract
            externalCallReturnData
            fulfillCaller
            fulfillTransactionHash
            fulfillMeta
            fulfillTimestamp
            cancelCaller
            cancelTransactionHash
            cancelMeta
            cancelTimestamp
          }
        }
      }
    `

    try {
      response = await sdk.querySubgraph(chain_id, query)
    } catch (error) {}
  }

  if (response?.user?.transactions?.length > 0) {
    graphql({ ...params, chain_id, query })
  }

  return {
    data: response?.user && {
      ...response.user,
      transactions: response.user.transactions?.map(t => {
        return {
          ...t,
          chainTx: tx_manager.chain_tx(t),
          chainId: Number(t.chainId),
          preparedTimestamp: Number(t.preparedTimestamp) * 1000,
          fulfillTimestamp: Number(t.fulfillTimestamp) * 1000,
          cancelTimestamp: Number(t.cancelTimestamp) * 1000,
          expiry: Number(t.expiry) * 1000,
          sendingAddress: tx_manager.from(t),
          sendingChainId: Number(t.sendingChainId),
          sendingChain: chains?.find(c => c.chain_id === Number(t.sendingChainId)),
          sendingAsset: tokens?.find(_t => _t.chain_id === Number(t.sendingChainId) && _t.contract_address === t.sendingAssetId),
          receivingChainId: Number(t.receivingChainId),
          receivingChain: chains?.find(c => c.chain_id === Number(t.receivingChainId)),
          receivingAsset: tokens?.find(_t => _t.chain_id === Number(t.receivingChainId) && _t.contract_address === t.receivingAssetId),
        }
      }).map(t => {
        return {
          ...t,
          order: t.chainId === t.receivingChainId ? 1 : 0,
        }
      })
    }
  }
}

export const transactions = async (sdk, chain_id, tx_id, params, chains, tokens) => {
  let data

  if (sdk && chain_id) {
    const max_size = typeof params?.max_size === 'number' ? params.max_size : 1000
    if (typeof params?.max_size !== 'undefined') {
      delete params.max_size
    }

    const size = typeof params?.size === 'number' ? params.size : 100
    if (typeof params?.size !== 'undefined') {
      delete params.size
    }

    const where = params?.where
    if (typeof params?.where !== 'undefined') {
      delete params.where
    }

    const direction = typeof params?.direction === 'string' ? params.direction : 'desc'
    if (typeof params?.direction !== 'undefined') {
      delete params.direction
    }

    const start = typeof params?.start === 'number' ? params.start : 0
    if (typeof params?.start !== 'undefined') {
      delete params.start
    }

    let skip = start, hasMore = true

    while (hasMore) {
      const query = `
        {
          transactions(orderBy: preparedTimestamp, orderDirection: ${direction}, skip: ${skip}, first: ${size}${where ? `, where: ${where}` : tx_id ? `, where: { transactionId: "${tx_id.toLowerCase()}" }` : ''}) {
            id
            status
            chainId
            preparedTimestamp
            receivingChainTxManagerAddress
            user {
              id
            }
            router {
              id
            }
            initiator
            sendingAssetId
            receivingAssetId
            sendingChainFallback
            callTo
            receivingAddress
            callDataHash
            transactionId
            sendingChainId
            receivingChainId
            amount
            expiry
            preparedBlockNumber
            encryptedCallData
            prepareCaller
            bidSignature
            encodedBid
            prepareTransactionHash
            prepareMeta
            relayerFee
            signature
            callData
            externalCallSuccess
            externalCallIsContract
            externalCallReturnData
            fulfillCaller
            fulfillTransactionHash
            fulfillMeta
            fulfillTimestamp
            cancelCaller
            cancelTransactionHash
            cancelMeta
            cancelTimestamp
          }
        }
      `

      let response
      try {
        response = await sdk.querySubgraph(chain_id, query)
      } catch (error) {}

      data = _.uniqBy(_.concat(data || [], response?.transactions?.map(t => {
        return {
          ...t,
          chainTx: tx_manager.chain_tx(t),
          chainId: Number(t.chainId),
          preparedTimestamp: Number(t.preparedTimestamp) * 1000,
          fulfillTimestamp: Number(t.fulfillTimestamp) * 1000,
          cancelTimestamp: Number(t.cancelTimestamp) * 1000,
          expiry: Number(t.expiry) * 1000,
          sendingAddress: tx_manager.from(t),
          sendingChainId: Number(t.sendingChainId),
          sendingChain: chains?.find(c => c.chain_id === Number(t.sendingChainId)),
          sendingAsset: tokens?.find(_t => _t.chain_id === Number(t.sendingChainId) && _t.contract_address === t.sendingAssetId),
          receivingChainId: Number(t.receivingChainId),
          receivingChain: chains?.find(c => c.chain_id === Number(t.receivingChainId)),
          receivingAsset: tokens?.find(_t => _t.chain_id === Number(t.receivingChainId) && _t.contract_address === t.receivingAssetId),
        }
      }).map(t => {
        return {
          ...t,
          order: t.chainId === t.receivingChainId ? 1 : 0,
        }
      }) || []), 'id')

      hasMore = /*where && */response?.transactions?.length === size

      if (hasMore) {
        skip += size
      }

      if (data.length >= max_size) {
        hasMore = false
      }

      if (response?.transactions?.length > 0) {
        if (params?.sync) {
          await graphql({ ...params, chain_id, query })
        }
        else {
          graphql({ ...params, chain_id, query })
        }
      }
    }
  }

  return { data }
}