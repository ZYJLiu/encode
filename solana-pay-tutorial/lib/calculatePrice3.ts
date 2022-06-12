import BigNumber from 'bignumber.js'
import { ParsedUrlQuery } from 'querystring'
import { products } from './input'

export default function calculateItem(
  query: ParsedUrlQuery
): [BigNumber, BigNumber] {
  let amount1 = new BigNumber(0)
  let amount2 = new BigNumber(0)
  for (let [id, quantity] of Object.entries(query)) {
    const product = products.find((p) => p.id === id)
    if (!product) continue

    if (product.id == 'USDC') {
      const price = product.priceUsd
      const productQuantity = new BigNumber(quantity as string)
      amount1 = amount1.plus(productQuantity.multipliedBy(price))
    } else {
      const price = product.priceUsd
      const productQuantity = new BigNumber(quantity as string)
      amount2 = amount2.plus(productQuantity.multipliedBy(price))
    }
  }

  return [amount1, amount2]
}
