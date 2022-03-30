import type { ReactElement } from 'react'
import LoginLayout from '../../layout/LoginLayout'
import type { NextPageWithLayout } from '../../@types/types'
import { useState } from 'react'
import Router from 'next/router'
import withMultiTenantCheck from '../../util/withMultiTenantCheck'
import { GetStaticPropsResult } from 'next'
import { getUser, supabaseServerClient } from '@supabase/supabase-auth-helpers/nextjs'
import { definitions } from '../../@types/supabase'
import ProfileForm from '../../components/ProfileForm'

type UserReadonlyProfile = definitions['squeak_profiles_readonly']

interface Props {}

const Profile: NextPageWithLayout<Props> = () => {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [organizationName, setOrganizationName] = useState('')

    const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)

        setLoading(true)
        const response = await fetch('/api/signup', {
            method: 'POST',
            body: JSON.stringify({ firstName, lastName, organizationName }),
        })

        if (!response.ok) {
            const errorResponse = await response.json()
            setError(errorResponse.error)
            return
        }

        Router.push('/questions')
    }

    return (
        <ProfileForm
            handleSignup={handleSignup}
            error={error}
            loading={loading}
            firstName={firstName}
            setFirstName={setFirstName}
            lastName={lastName}
            setLastName={setLastName}
            organizationName={organizationName}
            setOrganizationName={setOrganizationName}
        />
    )
}

Profile.getLayout = function getLayout(page: ReactElement) {
    return <LoginLayout title="Complete your profile">{page}</LoginLayout>
}

export const getServerSideProps = withMultiTenantCheck({
    async getServerSideProps(context): Promise<GetStaticPropsResult<Props>> {
        const { user } = await getUser(context)

        if (!user) {
            return {
                redirect: {
                    destination: '/signup',
                    permanent: false,
                },
            }
        }

        const { data: userReadonlyProfile } = await supabaseServerClient(context)
            .from<UserReadonlyProfile>('squeak_profiles_readonly')
            .select('role')
            .eq('user_id', user.id)
            .single()

        if (userReadonlyProfile && userReadonlyProfile.role) {
            return {
                redirect: {
                    destination: '/questions',
                    permanent: false,
                },
            }
        }

        return {
            props: {},
        }
    },
})

export default Profile
