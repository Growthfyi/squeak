import { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors'
import { supabaseServerClient } from '@supabase/supabase-auth-helpers/nextjs'
import { createClient } from '@supabase/supabase-js'
import { definitions } from '../../@types/supabase'

type UserProfile = definitions['squeak_profiles']
type UserProfileReadonly = definitions['squeak_profiles_readonly']

// This API route is for registering a new user from the JS snippet.
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const supabaseServiceRoleClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.SUPABASE_SERVICE_ROLE_KEY as string
    )

    await NextCors(req, res, {
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        origin: '*',
    })

    const { token, organizationId, firstName, lastName, avatar } = JSON.parse(req.body)

    if (!organizationId || !token) {
        res.status(400).json({ error: 'Missing required fields' })
        return
    }

    const { user, error: userError } = await supabaseServerClient({ req, res }).auth.api.getUser(token)

    if (!user || userError) {
        console.error(`[🧵 Register] Error fetching user profile`)
        res.status(500)

        if (userError) {
            console.error(`[🧵 Register] ${userError.message}`)
            res.json({ error: userError.message })
        }

        return
    }

    const { data: userProfile, error: userProfileError } = await supabaseServiceRoleClient
        .from<UserProfile>('squeak_profiles')
        .insert({
            first_name: firstName,
            last_name: lastName,
            avatar,
        })
        .limit(1)
        .single()

    if (!userProfile || userProfileError) {
        console.error(`[🧵 Register] Error creating user profile`)

        res.status(500)

        if (userProfileError) {
            console.error(`[🧵 Register] ${userProfileError.message}`)

            res.json({ error: userProfileError.message })
        }

        return
    }

    const { data: userProfileReadonly, error: userProfileReadonlyError } = await supabaseServiceRoleClient
        .from<UserProfileReadonly>('squeak_profiles_readonly')
        .insert({
            role: 'user',
            profile_id: userProfile.id,
            user_id: user.id,
            organization_id: organizationId,
        })
        .limit(1)
        .single()

    if (!userProfileReadonly || userProfileReadonlyError) {
        console.error(`[🧵 Register] Error creating user readonly profile`)

        res.status(500)

        if (userProfileReadonlyError) {
            console.error(`[🧵 Register] ${userProfileReadonlyError.message}`)

            res.json({ error: userProfileReadonlyError.message })
        }

        return
    }

    res.status(200).json({
        userId: user.id,
        profileId: userProfile.id,
        firstName,
        lastName,
        avatar,
        organizationId: organizationId,
    })
}

export default handler
