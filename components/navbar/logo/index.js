import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'

import Image from '../../image'

export default function Logo() {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  return (
    <div className="logo ml-2.5 mr-1 sm:mx-3">
      <Link href="/">
         <a className="w-full flex items-center">
          <div className="min-w-max sm:mr-3">
            <Image
              src={`/logos/logo${theme === 'dark' ? '_white' : ''}.png`}
              alt=""
              className="w-8 h-8"
            />
          </div>
          <div className="hidden sm:block lg:block xl:block">
            <div className="normal-case text-base font-semibold">{process.env.NEXT_PUBLIC_APP_NAME}</div>
            <div className="whitespace-nowrap font-mono text-gray-400 dark:text-gray-500 text-xs">{process.env.NEXT_PUBLIC_NETWORK}</div>
          </div>
        </a>
      </Link>
    </div>
  )
}